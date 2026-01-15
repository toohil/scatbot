import { pipeline, topk } from "@huggingface/transformers";
import { LocalIndex } from 'vectra';
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path';
import fs from 'fs';

const __dirname = import.meta.dirname;
const data_dir = path.join(__dirname, "db")

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
    const index = new LocalIndex(data_dir, "vector_index.json")
    if (!(await index.isIndexCreated())) {
      await index.createIndex();
    };
    this.index = index
  };

  async loadModel() {
    await this.createIndex();
    await super.loadModel();
    return "Model loaded."
  };
  
  async createVector(text) {
    const output = await this.pipe(
        text,
        { pooling: 'mean' },
    );
    // console.log("Created vector: "+text);
    return Array.from(output.data)
  };

  async addToIndex(input) {
    const vector = await this.createVector(input)
    const results = await this.queryIndex(vector, 1);
    if (results.length > 0 && results[0].score >= 1) {
      return "Item Already in Index: "+input
    } else {
      await this.index.insertItem({
        vector: vector,
        metadata: { input },
      })
      return "Item Added to Index: "+input
    }
  };

  async queryIndex(vector, count) {
    const vectors = await this.index.queryItems(vector, '', count);
    const results = [];
    if (vectors.length > 0) {
      for (const result of vectors) {
        const result_dict = {};
        result_dict['text'] = result.item.metadata.input;
        result_dict['score'] = result.score;
        results.push(result_dict);
      };
    };
    return results
  };

  async getTextMatches(text) {
    const vector_input = await this.createVector(text)
    const vector_matches = await this.queryIndex(vector_input, 3)
    const text_matches = []
    for (const v in vector_matches) {
      text_matches.push(vector_matches[v].text)
    }
    return text_matches
  }

}

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
      max_new_tokens: 200,
      return_full_text: true
      }
    )
    const reply = pipe_output[0].generated_text.at(-1);
    this.chatlog.push(reply);
    return reply.content
    // }
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

// Piecing it all together.
const text = fs.readFileSync('study_docs/SDJC01-PIL01 Stool Sample.docx.txt','utf-8')
const instructions = text.split('\r\n')

const vector_pipe = new VectorPipeline()
await vector_pipe.loadModel()
for (const i in instructions) {
  const instruction = instructions[i].replace(/[^a-z0-9áéíóúñü \.,_-]/gim,"");
  const instruction_clean = instruction.trim()
  if (instruction != "") { 
    console.log(await vector_pipe.addToIndex(instruction_clean))
  }
}

const chat_model = 'HuggingFaceTB/SmolLM2-1.7B-Instruct'
const system_prompt = "You are a research assistant in a psychological survey. You provide instructions and answers to participants in a stool sampling procedure. \
      Answer the prompt which follows the text \"User Query:\". Use only the information that follows the text \"Additional Information:\" when constructing your answer. \
      If the additional information does not contain a logical answer, you must respond that you do not know the answer."

const chat_pipe = new ChatbotPipeline(chat_model, system_prompt)
await chat_pipe.loadModel()
const query = "What should I do with the AnaeroGen sachet?"

const additional_info = await vector_pipe.getTextMatches(query)
console.log(additional_info)
const chat_query = `User Query: ${query} \n Additional Information: ${additional_info}`
const response = await chat_pipe.askChatbot(chat_query)
console.log(response)