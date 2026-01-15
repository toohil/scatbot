import { pipeline } from '@huggingface/transformers';
import { LocalIndex } from 'vectra';
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path';

const __dirname = import.meta.dirname;
const data_dir = path.join(__dirname, 'db') // this maybe could be reimplemented as an env var

class GenericPipeline {

  /**
   * Constructor for GenericPipeline object.
   * @param {string} task Task accepted by transformers.js pipeline object.
   * @param {string} model Pre-trained model to use.
   */
  constructor(task, model) {
    this.task = task
    this.model = model
    // set status to false - should refuse attempts to query unloaded model.
    this.status = false
  }

  /**
   * Prepares pipeline for usage.
   * @returns true when model loaded.
   */
  async loadModel() {
    this.pipe = await pipeline(
      this.task,
      this.model,
      { dtype: 'auto' },
    );
    this.status = true
    return this.status
  };

  /**
   * Getter method for model load status.
   * @returns {boolean} true if ready
   */
  static isModelReady() {
    return this.status
  };
}

class VectorPipeline extends GenericPipeline {

  /**
   * Constructor for VectorPipeline object, used to generate embeddings.
   */
  constructor() {
    const task = 'feature-extraction';
    const model = 'Xenova/jina-embeddings-v2-small-en';
    super(task, model)
    
    // create additional instance variable for vector index
    this.index = new LocalIndex(data_dir, 'vector_index.json')
  }

  /**
   * Extends parent class loadModel() method to initiate vector index.
   * @returns true
   */
  async loadModel() {
    // Create vector index if doesn't exist.
    if (!(await this.index.isIndexCreated())) {
      await this.index.createIndex();
    };
    // User parent class to load pipeline.
    await super.loadModel();
    return this.status
  };
  
  /**
   * Converts text prompt into vector array for RAG.
   * @param {string} text Text input
   * @returns vector array
   */
  async createVector(text) {
    // only do anything if model is loaded
    if (this.status == true) {
      // send text to model pipeline
      const output = await this.pipe(
          text,
          { pooling: 'mean' },
      );
      // parse output data, convert to array, return
      return Array.from(output.data)
    }
  };

  /**
   * Converts input text to vector and adds to index
   * @param {string} text text to add to index
   * @returns
   */
  async addToIndex(text) {
    // convert to vector
    const vector = await this.createVector(text)
    // check if vector matches existing indexed content
    const results = await this.queryIndex(vector, 1);
    if (results.length > 0 && results[0].score > 0.999) {
      // do not re-add to index if vector is non-unique
      return 'Already in Index: '+text
    } else {
      // add vector and metadata (input text) to index
      await this.index.insertItem({
        vector: vector,
        metadata: { text },
      })
      return 'Added to Index: '+text
    }
  };

  /**
   * Queries index for vector
   * @param {Array} vector 
   * @param {number} count 
   * @returns {Array} list of best matches, in dictionary keypairs with text, score.
   */
  async queryIndex(vector, count) {
    // query index for vectors
    const vectors = await this.index.queryItems(vector, '', count);
    // initialise output array
    const results = [];
    if (vectors.length > 0) {
      // only try to iterate if vectors array has values
      for (const result of vectors) {
        // construct results dictionary, format {'text': 'AB', 'score':xy}
        const result_dict = {};
        result_dict['text'] = result.item.metadata.input;
        result_dict['score'] = result.score;
        results.push(result_dict);
      };
    };
    return results
  };

  /**
   * Queries vector index for input text
   * @param {string} text 
   * @returns {Array} Most relevant text matches (unscored)
   */
  async getTextMatches(text) {
    // convert input to vector embedding
    const vector_input = await this.createVector(text)
    // query index for this vector
    const vector_matches = await this.queryIndex(vector_input, 3)
    const text_matches = []
    // convert output dictionary array to simple list of text data
    for (const vector of vector_matches) {
      text_matches.push(vector.text)
    }
    return text_matches
  }

}

class ChatbotPipeline extends GenericPipeline {
  
  /**
   * Constructor for ChatbotPipeline object, used to generate text.
   */
  constructor() {
    const task = 'text-generation';
    const model = 'HuggingFaceTB/SmolLM2-1.7B-Instruct';
    super(task, model)

    // chatlog array is used to store chat history.
    const system_prompt = `You are a research assistant in a psychological survey. You inform participants about a stool sampling procedure.
          Answer all subsequent prompts which follow "User Query:" in your own words, using only the provided information under "Additional Information:".
          If the additional information does not contain a logical answer to the query, respond that you do not know the answer.`
    this.chatlog = [{'role': 'system', 'content': system_prompt}];
  };

  /**
   * Query active chatbot pipeline for generated response.
   * @param {string} text User prompt
   * @returns {string} Chatbot reply
   */
  async askChatbot(text) {
    if (this.status == false) {
      // don't try to submit query if the model is not loaded
      return 'Must initialise model first'
    } else {
    // add user role, push to chatlog
    const newquery = {'role': 'user', 'content': text};
    this.chatlog.push(newquery);
    // feed chatlog into transformer pipeline
    const pipe_output = await this.pipe(this.chatlog, {
      max_new_tokens: 200,
      return_full_text: true
      }
    )
    // parse pipeline output for generated content
    const reply = pipe_output[0].generated_text.at(-1);
    // push reply to chatlog and return
    this.chatlog.push(reply);
    return reply.content
    }
  };
}

class ChatbotLogger {

  // Treating this as a class so we can implement multiple logging options:
  // * mysql is likely most stable, but requires starting an additional server on the host
  // * node:sqlite library is experimental currently, but would allow pure node frontend/backend, could very easily build a binary
  //   -> https://nodejs.org/api/single-executable-applications.html
  //   -> https://nodejs.org/api/sqlite.html

  constructor() {
    this.path = path.join(data_dir,'chat_messages.db')
    this.fileDb = new DatabaseSync(this.path);

    this.fileDb.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(64) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `)

    this.fileDb.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        session_id VARCHAR(64) PRIMARY KEY,
        role ENUM('system','user','bot') NOT NULL,
        content TEXT NOT NULL,
      )

    `)

  }

  static getpath() {
    return this.path
  }

  static createUser() {
    // create user - associate with session id and human-readable 'username'
  }

  static logMessage() {
    // log messages to messages table. possibly input in array (of arrays) - this will allow ['user':'message'] inputs for multiple message pairs.

  }

}

export { ChatbotPipeline, VectorPipeline }