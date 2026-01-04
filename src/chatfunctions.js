import { pipeline } from "@huggingface/transformers";

class ChatbotPipeline {
  static task = 'text-generation';
  static model = 'HuggingFaceTB/SmolLM2-135M-Instruct';

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
  {"role": "system", "content": "You are a research assistant in a psychological survey. Your specific task is to provide instructions and answers to participants regarding a stool sampling procedure. Keep responses to 50 words or less, using only simple sentence structuring."}
]

async function sendQuery(query) {
  const newquery = {"role": "user", "content": query};
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

async function askChatbot(query) {
  await sendQuery(query);
  return readResponse()
}

// sample query, outputs to console:
console.log(askChatbot('What can you do?'))