import { pipeline, cos_sim } from '@huggingface/transformers';
import fs from 'node:fs';

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
  constructor() {
    const task = 'feature-extraction';
    const model = 'Xenova/jina-embeddings-v2-small-en';
    super(task, model)
    
    // create additional instance variable for vector index
    this.db_path = './db/vector_index.json'
  }

  /**
   * Extends parent class loadModel() method to initiate vector index.
   * @returns true
   */
  async loadModel() {
    // Create vector index if doesn't exist.
    if (fs.existsSync(this.db_path)) {
      const fin = fs.readFileSync(this.db_path, "utf8", function(err){
        if(err) console.log("Error reading index.");
      })
      this.index = JSON.parse(fin)
    } else {    
    this.index = { vectors: [] }
    }
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
    const results = await this.queryIndex(vector);
    if (results.length > 0 && results[0]["score"] > 0.999) {
      // do not re-add to index if vector is non-unique
      return 'Already in Index: '+text
    } else {
      // add vector and metadata (input text) to index
      this.index.push({
        "vector": vector,
        "text": text,
      })
      return 'Added to Index: '+text
    }
  };

  /**
   * Queries index for vector
   * @param {Array} vector 
   * @param {number} count 
   * @returns {Promise<Array>} list of best matches, in dictionary keypairs with text, score.
   */
  async queryIndex(vector) {
    // query index for vectors
    const results = []
    for (const v of this.index["vectors"]) {
      let result = cos_sim(vector, v["vector"])
      if (result > 0.9) {
        results.push({
          "text": v["text"],
          "score": result  
        })
      }
    }
    if (results.length > 3) {
      results.sort(function(a,b) {return b["score"]-a["score"]})
      return results.slice(0,3)
    } else {
      return results
    }
  };

  /**
   * Queries vector index for input text
   * @param {string} text 
   * @returns {Promise<Array>} Most relevant text matches (unscored)
   */
  async getTextMatches(text) {
    // convert input to vector embedding
    const vector_input = await this.createVector(text)
    // query index for this vector
    const vector_matches = await this.queryIndex(vector_input)
    const text_matches = []
    // convert output dictionary array to simple list of text data
    for (const vector of vector_matches) {
      text_matches.push(vector["text"])
    }
    return text_matches
  }

}

class ChatbotPipeline extends GenericPipeline {
  
  /**
   * Constructor for ChatbotPipeline object, used to generate text.
   */
  constructor(system_prompt) {
    const task = 'text-generation';
    const model = 'HuggingFaceTB/SmolLM2-1.7B-Instruct';
    super(task, model)
    
    this.chatlog = [{
      role: "system", content: (system_prompt)
      }]
  };

  /**
   * Query active chatbot pipeline for generated response.
   * @param {string} text User prompt
   * @returns {Promise<string>} Chatbot reply
   */
  async askChatbot(text) {
    if (this.status == false) {
      // don't try to submit query if the model is not loaded
      return 'Must initialise model first'
    } else {
    // feed chatlog into transformer pipeline
    this.chatlog.push({role:"user", content: text})
    const pipe_output = await this.pipe(this.chatlog, {
      max_new_tokens: 128,
      return_full_text: true
      }
    )
    // parse pipeline output for generated content
    const reply = pipe_output[0].generated_text.at(-1);
    this.chatlog.push(reply)
    // push reply to chatlog and return
    return reply.content
    }
  };
} 

export { ChatbotPipeline, VectorPipeline }