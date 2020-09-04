import express from 'express';
import { accountModel } from '../models/accountModel.js';
import { formatCurrency } from '../helpers/formatHelper.js';

const app = express();

app.get('/', async (req, res) => {
  try {
    const account = await accountModel.find({});
    res.send(account);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/balance/:agencia/:conta', async (req, res) => {
  const { agencia, conta } = req.params;

  try {
    const account = await accountModel.findOne(
      {
        agencia: agencia,
        conta: conta,
      },
      { _id: 0, balance: 1 }
    );

    if (!account) {
      res.status(404).send('Conta não encontrada.');
    } else {
      res.send(account);
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

app.patch('/deposit/:agencia/:conta', async (req, res) => {
  const { agencia, conta } = req.params;
  const deposit = req.body.deposit;

  try {
    const account = await accountModel.findOneAndUpdate(
      {
        agencia: agencia,
        conta: conta,
      },
      { $inc: { balance: deposit } },
      { new: true }
    );

    if (!account) {
      res.status(404).send('Conta não encontrada.');
    } else {
      const currentBalance = account.balance;
      res.send(
        `Depósito realizado com sucesso. Saldo atual: ${currentBalance}`
      );
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

app.patch('/withdrawal/:agencia/:conta', async (req, res) => {
  const { agencia, conta } = req.params;
  const withdrawal = req.body.withdrawal;

  try {
    const queriedAccount = await accountModel.findOne({
      agencia: agencia,
      conta: conta,
    });

    if (!queriedAccount) {
      res.status(404).send('Conta não encontrada.');
    } else {
      if (queriedAccount.balance < withdrawal) {
        res.send('Saldo insuficiente para esta transação.');
      } else {
        const totalWithdrawal = withdrawal + parseInt(process.env.WDL_FEE);
        const accountUpdate = await accountModel.findOneAndUpdate(
          {
            agencia: agencia,
            conta: conta,
          },
          { $inc: { balance: -totalWithdrawal } },
          { new: true }
        );

        const currentBalance = accountUpdate.balance;
        res.send(`Saque realizado com sucesso. Saldo atual: ${currentBalance}`);
      }
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

app.delete('/delete/:agencia/:conta', async (req, res) => {
  const { agencia, conta } = req.params;
  try {
    const account = await accountModel.findOneAndRemove({
      agencia: agencia,
      conta: conta,
    });
    if (!account) {
      res.status(404).send('Conta não encontrada.');
    } else {
      const accountsInThisBranch = await accountModel.countDocuments({
        agencia: agencia,
      });
      res.send(
        `Conta removida com sucesso. Novo total de contas nesta agência: ${accountsInThisBranch}`
      );
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

app.patch('/transfer', async (req, res) => {
  const { fromBranch, fromAccount, toBranch, toAccount, value } = req.body;

  try {
    const fromAccountData = await accountModel.findOne({
      agencia: fromBranch,
      conta: fromAccount,
    });

    const toAccountData = await accountModel.findOne({
      agencia: toBranch,
      conta: toAccount,
    });

    const commitTransfer = async (fee) => {
      const debitFromOrigin = value + fee;
      const fromAccountUpdate = await accountModel.findOneAndUpdate(
        {
          agencia: fromBranch,
          conta: fromAccount,
        },
        {
          $inc: {
            balance: -debitFromOrigin,
          },
        },
        { new: true }
      );

      const toAccountUpdate = await accountModel.findOneAndUpdate(
        {
          agencia: toBranch,
          conta: toAccount,
        },
        {
          $inc: {
            balance: value,
          },
        },
        { new: true }
      );

      const fromAccountBalance = fromAccountUpdate.balance;
      const toAccountBalance = toAccountUpdate.balance;

      res.send(
        `Transferência efetuada com sucesso.\
        Saldo atual na conta de origem: ${fromAccountBalance}.\
        Saldo atual na conta de destino: ${toAccountBalance}`
      );
    };

    if (!fromAccountData || !toAccountData) {
      res.status(404).send('Uma das contas não foi encontrada.');
    } else {
      if (fromAccountData.balance < value) {
        res.send('Saldo insuficiente na conta de origem.');
      } else {
        if (fromBranch !== toBranch) {
          commitTransfer(parseInt(process.env.TXR_FEE));
        } else {
          commitTransfer(0);
        }
      }
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/average/:agencia', async (req, res) => {
  const { agencia } = req.params;

  try {
    const account = await accountModel.aggregate([
      { $match: { agencia: Number(agencia) } },
      {
        $group: { _id: { agencia: '$agencia' }, average: { $avg: '$balance' } },
      },
    ]);
    const averageBalance = formatCurrency(account[0].average);
    res.send(`O saldo médio da agência ${agencia} é ${averageBalance}.`);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/menorSaldo/:amount', async (req, res) => {
  const amount = parseInt(req.params.amount);

  try {
    const account = await accountModel
      .find({}, { _id: 0 })
      .sort({ balance: 1 })
      .limit(amount);
    res.send(account);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/maiorSaldo/:amount', async (req, res) => {
  const amount = parseInt(req.params.amount);

  try {
    const account = await accountModel
      .find({}, { _id: 0 })
      .sort({ balance: -1 })
      .limit(amount);
    res.send(account);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.put('/promote', async (req, res) => {
  try {
    const branches = await accountModel.distinct('agencia');
    for (let i = 0; i < branches.length; i++) {
      const vipClient = await accountModel
        .findOne({ agencia: branches[i] })
        .sort({ balance: -1 })
        .limit(1);

      const commitPromotion = await accountModel.updateOne(
        { _id: vipClient._id },
        { $set: { agencia: 99 } },
        { new: true }
      );
    }
    const vipClients = await accountModel.find({ agencia: 99 });
    res.send(vipClients);
  } catch (err) {
    res.status(500).send(err);
  }
});

export { app as accountRouter };
