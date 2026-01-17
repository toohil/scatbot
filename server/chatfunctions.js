import { ChatbotPipeline, VectorPipeline } from './chatpipelines.js';

// import fs from 'fs';

// DEMO CODE - INSERTING EMBEDDINGS INTO DB.
// const text = fs.readFileSync('study_docs/SDJC01-PIL01 Stool Sample.docx.txt','utf-8')
// const instructions = text.split('\r\n')
// for (const i of instructions) {
//   const instruction = i.replace(/[^a-z0-9áéíóúñü \.,_-]/gim,"");
//   const instruction_clean = instruction.trim()
//   if (instruction != "") {
//     await vector_pipe.addToIndex(instruction_clean)
//   }
// }

const __dirname = import.meta.dirname;
const data_dir = path.join(__dirname, 'db') // this could eventually be implemented as an env var


class ChatLogger {

  // Treating this as a class so we can implement multiple logging options:
  // * mysql is likely most stable, but requires starting an additional server on the host
  // * node:sqlite library is experimental currently, but would allow pure node frontend/backend, could very easily build a binary
  //   -> https://nodejs.org/api/single-executable-applications.html
  //   -> https://nodejs.org/api/sqlite.html
  // Note we're implementing logging outside the chatbot class - we only want to create one database object.

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

  static createUser(uuid) {
    // create user - associate with session id and human-readable 'username'
  }

  static logMessage(uuid, role, content) {
    // log messages to messages table. possibly input in array (of arrays) - this will allow ['user':'message'] inputs for multiple message pairs.

  }

}

class Chatbot {

  constructor() {
    this.vpipe = new VectorPipeline()
    this.cpipe = new ChatbotPipeline()
    this.status = false
  }

  async initChatbot() {
    await this.vpipe.loadModel(data_dir)
    await this.cpipe.loadModel()
    this.status = true
  }

  static getChatbotStatus() {
    return this.status
  }

  async getChatbotResponse(text) {
    const context = await vpipe.getTextMatches(text)
    const query = `text+${context}`
    const response = await cpipe.askChatbot(query)
    return response
  }

  async killChatbot() {
    this.vpipe.unloadModel()
    this.cpipe.unloadModel()
  }
}

export { ChatLogger, Chatbot }