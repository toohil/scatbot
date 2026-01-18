import { pipeline } from '@huggingface/transformers';
import { LocalIndex } from 'vectra';

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

  async unloadModel() {
    this.pipe.dispose()
  }

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
   * @param {string} dirname Target path to vector index file.
  */
  constructor(dirname) {
    const task = 'feature-extraction';
    const model = 'Xenova/jina-embeddings-v2-small-en';
    super(task, model)
    
    // create additional instance variable for vector index
    this.index = new LocalIndex(dirname, 'vector_index.json')
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
  };

  /**
   * Query active chatbot pipeline for generated response.
   * @param {string} text User prompt
   * @returns {string} Chatbot reply
   */
  async askChatbot(chatlog) {
    if (this.status == false) {
      // don't try to submit query if the model is not loaded
      return 'Must initialise model first'
    } else {
    // feed chatlog into transformer pipeline
    const pipe_output = await this.pipe(chatlog, {
      max_new_tokens: 200,
      return_full_text: true
      }
    )
    // parse pipeline output for generated content
    const reply = pipe_output[0].generated_text.at(-1);
    // push reply to chatlog and return
    chatlog.push(reply);
    return chatlog
    }
  };
} 

export { ChatbotPipeline, VectorPipeline }