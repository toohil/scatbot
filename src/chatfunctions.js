import { pipeline } from "@huggingface/transformers";
import fs from 'fs';

const knowledgeDB = [];
const extractor = await pipeline('feature-extraction', 'Xenova/jina-embeddings-v2-small-en');

// let file = fs.readFileSync('study_docs/SDJC01-PIL01 Stool Sample.docx.txt')
// const instructions = file.toString().split('\n')

const rag_output = await extractor(
     instructions,
     { pooling: 'mean' }
);

async function addToDB(input) {

}

class ChatbotPipeline {
  static task = 'text-generation';
  static model = 'HuggingFaceTB/SmolLM2-360M-Instruct';

  static async getInstance() {

    this.instance = pipeline(
      this.task,
      this.model,
      { dtype: "auto" },
    );
    return this.instance;  
  }
  // TODO: RAG can be implemented here at class level.
}

const pipe = await ChatbotPipeline.getInstance();

var chatlog = [
  {"role": "system", "content": "You are a research assistant in a psychological survey. \
    Your specific task is to provide instructions and answers to participants regarding a stool sampling procedure. \
    Keep responses to 20 words or less, using the following context:"+instructions+"\
    If you do not know the answer, communicate this to the user."}
]

async function sendQuery(query) {
  const contextquery = query
  const newquery = {"role": "user", "content": contextquery};
  chatlog.push(newquery);
  const pipe_output = await pipe(chatlog, {
    max_new_tokens: 100,
    return_full_text: true
    }
  )
  const reply = pipe_output[0].generated_text.at(-1);
  chatlog.push(reply);
  return reply.content
}

function readResponse() {
  const output = chatlog.at(-1).content;
  return output;
}

export { sendQuery, readResponse, askChatbot }

async function askChatbot(query) {
  await sendQuery(query);
  console.log(readResponse())
}

// sample query, outputs to console 