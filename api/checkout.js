import {route} from '../lib/payment.js';
export default route(async(req,res)=>{res.status(410).json({error:'Stripe is disconnected from new Unabl payments. Use Venmo or Cash App for direct gifts. New album purchases are paused.'});});
