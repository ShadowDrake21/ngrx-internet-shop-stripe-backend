import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import createPurchase from '../../controllers/purchaseControllers.js';
import cors from 'cors';
import bodyparser from 'body-parser';

dotenv.config();

const app = express();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_API_KEY);

router.use(bodyparser.urlencoded({ extended: false }));
router.use(bodyparser.json());
router.use(cors({ origin: true, credentials: true }));

router.get('/success', async (req, res) => {
  const session_id = req.query.session_id;

  const session = await stripe.checkout.sessions.retrieve(session_id);
  const customer = await stripe.customers.retrieve(session.customer);
  const lineItems = await stripe.checkout.sessions.listLineItems(session_id);
  const minimizeProducts = lineItems.data.map((product) => ({
    price_id: product.price.id,
    product_id: product.price.product,
    quantity: product.quantity,
  }));
  const purchaseItem = {
    productsIds: minimizeProducts,
    payment_intent: session.payment_intent,
    total_price: session.amount_total / 100,
    customer_id: customer.id,
    session_id: session_id,
  };
  createPurchase(purchaseItem);

  res.send(
    `<html>
    <head>
      <title>Thanks for your order!</title>
      <link rel="stylesheet" href="/style.css" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    </head>
    <body>
      <section class="success">
      <img class="image" src="/images/check.png" alt="success purchasing" />
        <div class="info">
        <div class="info-inner">
          <p>Thank you for your order, ${customer.name || 'my friend'}!</p>
          <p>
            You will receive an order confirmation email with details of your
            order. Here are your ordered items:
          </p>
          <h4 style="text-align: end;">Total price: ${
            session.amount_total / 100
          }
          ${session.currency.toUpperCase()}</h4>
          ${lineItems.data
            .map(
              (item) =>
                `<ul>
              <li>Name: ${item.description}</li>
              <li>Price: ${item.amount_total / 100}
              ${item.currency.toUpperCase()}</li>
              <li>Quantity: ${item.quantity}</li></ul>`
            )
            .join('')}
          </div>
        </div>
        <a
            class="go-back-link"
            href="https://ngrx-internet-shop.netlify.app"
            style="text-align: center"
            >Go back to shop</a
          >
      </section>
    </body>
  </html>`
  );
});

app.use('/.netlify/functions/success', router);

export const handler = serverless(app);
