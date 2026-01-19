import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { ChatbotPipeline, VectorPipeline } from './chatpipelines.js';

const instructions = `Instructions for Collecting Stool Sample (bowel motion sample)

The stool sample should be as fresh as possible, ideally produced the morning of your visit.

If this is not possible, a sample from the evening/night before may be saved and stored in a fridge. This is not ideal and may interfere with analysis of the sample; therefore a sample from the morning of your visit is preferred.

* Sample Pack:
   Please find enclosed in sample pack:
      1. Plastic lunch-box size container with a lid (for stool sample)
      2. Disposable gloves
      3. 2 x Zip lock bag
      4. AnaeroGen sachet.
      5. Paper Envelope
      6. Freezer Block

* Night Before Sample Gathering
   * Place the freezer block in the freezer overnight to freeze. 

* Sample Gathering:
   * Place the frozen freezer block in one of the ziplock bags.
   * Put on the disposable gloves.
   * Place the plastic container onto the toilet bowl and perform bowel movement into this (the whole bowel motion, not just part of it). Please avoid getting any urine in the plastic container and do not wrap or cover the sample in toilet paper.
   * Tear off the top of the AnaeroGen sachet which is taped to the lid of the container (see image below). Do not remove the inner sachet.
   * Within one minute of tearing the top of the sachet, secure the lid of the container firmly, and place the plastic container in second zip lock bag (i.e. the empty bag).
   * Remove and dispose of gloves.
   * Seal the zip lock bag, place the ziplock bag with the stool sample into the ziplock bag containing the frozen freezer block, and seal.
   * Place the ziplock bag (containing the freezer block, and containing the ziplock bag with the stool sample) in the paper envelope and seal.
   * Write down the date and the time of the stool sample on the envelope. 
   * Place the sample in the fridge until you leave for the research lab session`

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
      INSERT INTO messages ( session_id, role, content )
      VALUES ( ?, ?, ? )
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

  async addMessage(uuid, role, content) {
    // console.log(uuid)
    // console.log(typeof(role))
    // console.log(content)
    this.add_message.run(uuid, role, content)
  }

  async getMessages(uuid) {
    return this.get_message.all(uuid)
  }

  
}

class Chatbot {

  constructor() { 
    this.vpipe = new VectorPipeline(dbdir)
    this.cpipe = new ChatbotPipeline();
    this.status = false;
    const system_prompt = `You are a research assistant in a psychological survey.
    Your job is to answer participant questions for a procedure outlined below:
    ${instructions}`
    this.chatlog = [{'role': 'system', 'content': system_prompt}];
    }

  async initChatbot() {
    await this.cpipe.loadModel();
    await this.vpipe.loadModel()
    this.status = true;
  }

  static getChatbotStatus() {
    return this.status;
  }

  async getChatbotResponse(text) {
    const context = await this.vpipe.getTextMatches(text);
    const prompt = `Answer the following USER QUERY: ${text}
      Do not use any prelearned knowledge in your answer. Refer only to the study instructions and this ADDITIONAL CONTEXT:
      ${context}
      If you do not know the answer based on the above, reply that the query is out of scope.`;

    // add user role, push to chatlog
    this.chatlog.push({'role':'user','content':prompt})
    const output = await this.cpipe.askChatbot(this.chatlog);
    this.chatlog = output
    const response = output[(output.length - 1)].content;
    return response;
  }

  async killChatbot() {
    this.cpipe.unloadModel();
    this.vpipe.unloadModel();
  }
}

export { Chatbot, ChatLogger };