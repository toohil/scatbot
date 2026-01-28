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
    // console.log(uuid)
    // console.log(typeof(role))
    // console.log(content)
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
    const system_prompt = `You are Scatbot, a helpful assistant for psychological surveys. You provide information on the following procedure:
      ${this.steps.toString()}
      You will be given a PARTICIPANT QUERY, the CURRENT STEP they are following, and ADDITIONAL CONTEXT.
      Address the participant directly in your responses, using the provided context. Keep responses concise, just one sentence.
      If the participant's question is not in any of the context provided, reply that you do not know.`

    this.cpipe = new ChatbotPipeline(system_prompt);
    this.status = false;
  }

  async initChatbot() {
    await this.cpipe.loadModel();
    this.status = true;
  }

  static getChatbotStatus() {
    return this.status;
  }

  async getChatbotResponse(query_type, text) {
    
    let prompt = ""
    if (query_type === "step") {
      // handle next step
      this.current_step = this.steps[this.step_counter]
      prompt = `Rephrase this next instruction for clarity: ${this.current_step}`
      this.step_counter++
    } else if (query_type === "more") {
      // handle more info
      let context = await vpipe.getTextMatches(this.current_step)
      context.toString()
      prompt = `Provide more information on this step: ${this.current_step}
                You may use the following context in your response:
                ${context}`
    } else {
      // keep existing behaviour - freetext question.
      let context = await vpipe.getTextMatches(text);
      context = context.toString();
      prompt = `Answer the following question: ${text}
        You may use the following context in your response:
        ${context}`
    }
    const output = await this.cpipe.askChatbot(prompt);
    return output;
  }

  async killChatbot() {
    this.cpipe.unloadModel();
  }
}

export { Chatbot, ChatLogger };