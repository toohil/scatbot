import { pipeline } from "@huggingface/transformers";
import fs from 'fs';
import { LocalIndex } from 'vectra';
import path from 'node:path';

class GenericPipeline {

  constructor(task, model) {
    this.task = task
    this.model = model
    this.status = false
  }

  async loadModel() {
    this.pipe = await pipeline(
      this.task,
      this.model,
      { dtype: "auto" },
    );
    this.status = true
    return this.status
  };

  static isModelReady() {
    if (this.status == false) {
      return false
    }
    return true
  };
}

class VectorPipeline extends GenericPipeline {

  constructor() {
    const task = 'feature-extraction';
    const model = 'Xenova/jina-embeddings-v2-small-en';
    super(task, model)
  }
  
  async createIndex() {
    const index = new LocalIndex(path.join(process.cwd(), 'index'))
    if (!(await index.isIndexCreated())) {
      await index.createIndex();
    };
    this.index = index
  };

  async loadModel() {
    await this.createIndex()
    await super.loadModel()
    return "Model loaded."
  };
  
  async createEmbedding(text) {
    const output = await this.pipe(
        text,
        { pooling: 'mean' },
    );
    return Array.from(output.data);
  };

  async addToIndex(input) {
    const vector = await this.createEmbedding(input)
    console.log("Created vector: "+input)
    const db_check = await this.index.queryItems(vector, 3);
    if (db_check.length > 0 && db_check[0].score >= 1) {
      return "Item Already in Index: "+input
    } else {
      await this.index.insertItem({
        vector: vector,
        metadata: { input },
      })
      return "Item Added to Index: "+input
    }
    
  };

  async queryIndex(text) {
    const vector = await this.createEmbedding(text);
    const results = await this.index.queryItems(vector, 3);
    if (results.length > 0) {
        for (const result of results) {
            console.log(`[${result.score}] ${result.item.metadata.input}`);
        }
    } else {
        console.log('No results found.');
    }
  }
}

// TEST FUNCTION CALLS - VECTORPIPELINE
const pipe1 = new VectorPipeline()
console.log(await pipe1.loadModel())
console.log(await pipe1.addToIndex('apple'))
console.log(await pipe1.addToIndex('oranges'))
console.log(await pipe1.addToIndex('red'))
console.log(await pipe1.addToIndex('blue'))
await pipe1.queryIndex('green')

class ChatbotPipeline extends GenericPipeline {
  
  constructor(model, system_prompt) {

    const task = 'text-generation';
    super(task, model)

    this.chatlog = [
    {"role": "system", "content": system_prompt}
    ];
  };

  async askChatbot(query) {
    // if (this.isModelReady() == false) {
    //   return "Model is not ready."
    // } else {
    const contextquery = query
    const newquery = {"role": "user", "content": contextquery};
    this.chatlog.push(newquery);
    const pipe_output = await this.pipe(this.chatlog, {
      max_new_tokens: 100,
      return_full_text: true
      }
    )
    const reply = pipe_output[0].generated_text.at(-1);
    this.chatlog.push(reply);
    return reply.content
    // }
  };
}

// TEST FUNCTION CALLS - CHATBOTPIPELINE
const chat_model = 'HuggingFaceTB/SmolLM2-1.7B-Instruct'
const system_prompt = "You are a research assistant in a psychological survey. \
      Your specific task is to provide instructions and answers to participants regarding a stool sampling procedure. \
      If you do not know the answer, communicate this to the user."
const pipe2 = new ChatbotPipeline(chat_model, system_prompt);
await pipe2.loadModel()
const prompt = "What can you do?"
const response = await pipe2.askChatbot(prompt)
console.log(response)
// here we have prompt, response as const vars - could easily log in main code.