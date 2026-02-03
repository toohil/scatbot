import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { ChatbotPipeline, VectorPipeline } from './chatpipelines.js';

// I think data_dir should eventually be implemented as an env variable.
// for the time being, declaring it here lets us pass it to the vector pipeline, keeping everything in the same place.

const __dirname = import.meta.dirname;
const dbdir = path.join(__dirname, "db")

class ChatLogger {
  
  constructor() {
    const chatdb = path.join(dbdir, "chat_messages.db")
    this.db = new DatabaseSync(chatdb)
  }

  async init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT current_timestamp,
        last_seen TEXT NOT NULL DEFAULT current_timestamp,
        message_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS messages (
        message_id INTEGER PRIMARY KEY NOT NULL,
        session_id VARCHAR NOT NULL,
        chat_id TEXT NOT NULL,
        role TEXT CHECK(role in ('user','bot')) NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT current_timestamp
      );`
    );

    this.add_user = this.db.prepare(`
      INSERT INTO sessions ( session_id )
      VALUES ( ? )
      `
    );

    this.get_user = this.db.prepare(`
      SELECT * FROM sessions WHERE session_id = ?
      `
    );

    this.add_message = this.db.prepare(`
      INSERT INTO messages ( session_id, chat_id, role, content )
      VALUES ( ?, ?, ?, ? )
      `
    );

    this.get_message = this.db.prepare(`
      SELECT * FROM messages WHERE session_id = ?
      `
    );
  }

  async addUser(uuid) {
    this.add_user.run(`${uuid}`)
  }

  async getUser(uuid) {
    const user = this.get_user.all(uuid)
    return user[0]
  }

  async addMessage(uuid, id, role, content) {
    this.add_message.run(uuid, id, role, content)
  }

  async getMessages(uuid) {
    return this.get_message.all(uuid)
  }

  
}

// creating just one vector pipeline instance - use for all chatbots.
const vpipe = new VectorPipeline()
await vpipe.loadModel()

class Chatbot {

  constructor(steps) { 
    this.steps = steps
    this.step_counter = 0 // not a pedometer
    this.current_step = ""
    // const system_prompt = `You are Scatbot, a helpful assistant for psychological surveys. You provide information on the following procedure:
    //   ${this.steps.toString()}
    //   Address the participant directly in your responses. Keep your responses concise and avoid repeating phrases.`

    this.cpipe = new ChatbotPipeline("");
    this.status = false;
    this.last_bot = ""
  }

  async initChatbot() {
    await this.cpipe.loadModel();
    this.status = true;
  }

  static getChatbotStatus() {
    return this.status;
  }

  async getChatbotResponse(text) {
    
    let prompt = ""
    if (text === "NEXT STEP") {
      // handle next step
      this.current_step = this.steps[this.step_counter]
      this.step_counter++
      this.cpipe.resetChatlog(`You are Scatbot, a research assistant for a biological sample collection study.
        Keep all your responses concise and neutral in tone.`)
      // I've tried some other fun adjectives here
      prompt = `Rewrite the following text. Do not follow the instruction in the text. Do not remove any information. Reply only with your rewritten version of the text.
                Text to rewrite: "${this.current_step}"`
    } else if (text === "MORE INFO") {
      // handle more info - retrieve last response, run through embed db for similar.
      let context = await vpipe.getTextMatches(this.last_bot)
      console.log("Retrieved context:", context)
      context = context.toString()
      prompt = `Briefly expand your previous answer. You may use the additional context below if it is related to your previous answer.
                Additional context: ${context}`
    } else {
      // keep existing behaviouisuppor - freetext question.
      let context = await vpipe.getTextMatches(text);
      console.log("Retrieved context:", context)
      context = context.toString();
      prompt = `Question: ${text}
                Try to answer this question using the additional context provided. If you cannot find the answer, reply "I don't have the answer to this question."
                Additional context: ${context}`
    }
    console.log("Trying prompt:", prompt)
    let output = await this.cpipe.askChatbot(prompt);
    console.log("Received output:", output)
    if (output.at(0) === `"` && output.at(-1) === `"`) {
      // handle chatbot returning text wrapped in quotations
      output = output.slice(1, -1)
    }
    if (text === "MORE INFO" && this.last_bot === output) {
      // handle chatbot repeating same step after more info.
      output = "There is no additional information available at this stage. Try asking a specific question, or move to the next step."
    }
    this.last_bot = output
    return output;
  }

  async killChatbot() {
    this.cpipe.unloadModel();
  }
}

export { Chatbot, ChatLogger };