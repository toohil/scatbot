import { pipeline } from "@huggingface/transformers";
import fs from 'fs';

// const extractor = await pipeline('feature-extraction', 'Xenova/jina-embeddings-v2-small-en');

// let file = fs.readFileSync('SDJC01-PIL01 Stool Sample.docx.txt')
// const instructions = file.toString().split('\n')

const instructions = "Instructions for Collecting Stool Sample (bowel motion sample)\
  The stool sample should be as fresh as possible, ideally produced the morning of your visit.\
  If this is not possible, a sample from the evening/night before may be saved and stored in a fridge. This is not ideal and may interfere with analysis of the sample; therefore a sample from the morning of your visit is preferred\
  * Sample Pack:\
    Please find enclosed in sample pack:\
        1. Plastic lunch-box size container with a lid (for stool sample)\
        2. Disposable gloves\
        3. 2 x Zip lock bag\
        4. AnaeroGen sachet.\
        5. Paper Envelope\
        6. Freezer Block\
  * Night Before Sample Gathering\
    * Place the freezer block in the freezer overnight to freeze.\
  * Sample Gathering:\
    * Place the frozen freezer block in one of the ziplock bags.\
    * Put on the disposable gloves.\
    * Place the plastic container onto the toilet bowl and perform bowel movement into this (the whole bowel motion, not just part of it). Please avoid getting any urine in the plastic container and do not wrap or cover the sample in toilet paper.\
    * Tear off the top of the AnaeroGen sachet which is taped to the lid of the container (see image below). Do not remove the inner sachet.\
    * Within one minute of tearing the top of the sachet, secure the lid of the container firmly, and place the plastic container in second zip lock bag (i.e. the empty bag).\
    * Remove and dispose of gloves.\
    * Seal the zip lock bag, place the ziplock bag with the stool sample into the ziplock bag containing the frozen freezer block, and seal.\
    * Place the ziplock bag (containing the freezer block, and containing the ziplock bag with the stool sample) in the paper envelope and seal.\
    * Write down the date and the time of the stool sample on the envelope.\
    * Place the sample in the fridge until you leave for the research lab session"


// const rag_output = await extractor(
//     instructions,
//     { pooling: 'mean' }
// );

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