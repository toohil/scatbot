// `The stool sample should be as fresh as possible, ideally produced the morning of your visit.

// If this is not possible, a sample from the evening/night before may be saved and stored in a fridge. This is not ideal and may interfere with analysis of the sample; therefore a sample from the morning of your visit is preferred.

// * Sample Pack:
//    Please find enclosed in sample pack:
//       1. Plastic lunch-box size container with a lid (for stool sample)
//       2. Disposable gloves
//       3. 2 x Zip lock bag
//       4. AnaeroGen sachet.
//       5. Paper Envelope
//       6. Freezer Block

// * Night Before Sample Gathering
//    * Place the freezer block in the freezer overnight to freeze. 

// * Sample Gathering:
//    * Place the frozen freezer block in one of the ziplock bags.
//    * Put on the disposable gloves.
//    * Place the plastic container onto the toilet bowl and perform bowel movement into this (the whole bowel motion, not just part of it). Please avoid getting any urine in the plastic container and do not wrap or cover the sample in toilet paper.
//    * Tear off the top of the AnaeroGen sachet which is taped to the lid of the container (see image below). Do not remove the inner sachet.
//    * Within one minute of tearing the top of the sachet, secure the lid of the container firmly, and place the plastic container in second zip lock bag (i.e. the empty bag).
//    * Remove and dispose of gloves.
//    * Seal the zip lock bag, place the ziplock bag with the stool sample into the ziplock bag containing the frozen freezer block, and seal.
//    * Place the ziplock bag (containing the freezer block, and containing the ziplock bag with the stool sample) in the paper envelope and seal.
//    * Write down the date and the time of the stool sample on the envelope. 
//    * Place the sample in the fridge until you leave for the research lab session.`


import { VectorPipeline } from "./chatpipelines.js";
import { cos_sim } from "@huggingface/transformers";
import fs from 'node:fs';

const vpipe = new VectorPipeline()

const fin = fs.readFileSync("vector_index.json", "utf8", function(err){
    if(err) throw err;
  })
const vectordb = JSON.parse(fin)
// console.log(vectordb.vectors)

await vpipe.loadModel()
const prompt = await vpipe.createVector("Tell me about AnaeroGen")
const outputs = []

for (const v of vectordb["vectors"]) {
   // console.log(v)
   let vector = v["vector"]
   let result = cos_sim(prompt, vector)
   if (result > 0.75) {
      outputs.push(v["text"])
   }
   // console.log(v["text"], String(result))
}

console.log(outputs)
