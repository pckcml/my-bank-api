import express from 'express';
import mongoose from 'mongoose';
import { accountRouter } from './routes/accountRouter.js';

/* Git_1 */
const PORT = process.env.PORT;
const ATLAS_USERNAME = process.env.ATLAS_USERNAME;
const ATLAS_PASSWORD = process.env.ATLAS_PASSWORD;
const CONNECTION_STRING = `mongodb+srv://${ATLAS_USERNAME}:${ATLAS_PASSWORD}@cluster0.3rlot.azure.mongodb.net/my-bank-api?retryWrites=true&w=majority`;

(async () => {
  try {
    await mongoose.connect(CONNECTION_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    });
  } catch (err) {
    console.log('Erro ao conectar no MongoDB: ' + err);
  }
})();

const app = express();
app.use(express.json());
app.use('/accounts', accountRouter);

app.listen(PORT, () => {
  console.log('API started!');
});
