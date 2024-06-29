import express from 'express';
import cors from 'cors';
import bodyparser from 'body-parser';
import Stripe from 'stripe';
// import createPurchase from './controllers/purchaseControllers.js';
import dotenv from 'dotenv';
import serverless from 'serverless-http';

dotenv.config();

const app = express();
const router = express.Router();
// app.use(express.static('public'));
// app.use('/images', express.static('images'));
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(cors({ origin: true, credentials: true }));

const { PORT, STRIPE_API_KEY, HOST_URL } = process.env;

const stripe = new Stripe(STRIPE_API_KEY);

app.post('/checkout', async (req, res, next) => {
  try {
    const { email } = req.body;

    let customer;
    try {
      customer = await stripe.customers.list({ email: email, limit: 1 });
      customer = customer.data[0];
    } catch (error) {
      next(error);
      return;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      shipping_address_collection: {
        allowed_countries: ['UA', 'PL'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0,
              currency: 'PLN',
            },
            display_name: 'Free shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 4,
              },
              maximum: {
                unit: 'business_day',
                value: 8,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1500,
              currency: 'PLN',
            },
            display_name: 'Next day air',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 1,
              },
              maximum: {
                unit: 'business_day',
                value: 1,
              },
            },
          },
        },
      ],
      line_items: req.body.items.map((item) => ({
        price_data: {
          currency: 'PLN',
          product_data: {
            name: item.title,
            images: item.images,
          },
          unit_amount: item.price * 100,
        },
        quantity: item.quantity,
      })),
      phone_number_collection: {
        enabled: true,
      },
      mode: 'payment',
      success_url: `${HOST_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${HOST_URL}/cancel.html`,
    });

    res.status(200).json(session);
  } catch (error) {
    next(error);
  }
});
app.use('/.netlify/functions/checkout', router);

export const handler = serverless(app);
