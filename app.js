import express from 'express';
import mongoose from 'mongoose';
import { accountRouter } from './routes/accountRouter.js';

/* Git_1 */
const PORT = process.env.PORT;

(async () => {
  try {
    await mongoose.connect(
      'mongodb+srv://patrick:Banquinh8@cluster0.3rlot.azure.mongodb.net/my-bank-api?retryWrites=true&w=majority',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      }
    );
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
