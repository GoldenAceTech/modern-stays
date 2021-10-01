import express, {Request, Response} from 'express';
import {Document,Schema} from 'mongoose';
const router = express.Router({mergeParams:true});
const {checkStayValidity,createNewStay,updateStay}= require('../schemaValidations/staySchemaValidation');
const wrapAsync = require('../utils/wrapAsync');
const {checkQuery} = require('../middlewares/checkQuery');
const{Stay} = require('../models/staySchema');
const{reviewErrors} = require('../schemaValidations/reviewSchemaValidation');
const{bookErrors} = require('../schemaValidations/bookSchemaValidation');
const {isAuthenticated} = require('../middlewares/isAuthenticated');

router.route('')
.get(checkQuery,wrapAsync(async(req:Request, res: Response)=>{  
  let{query,sorts,location,page_offset,results}=res.locals;

  let idArray:Array<Schema.Types.ObjectId> = []

  results.forEach((result:Document)=>{
    idArray.push(result._id)
  })    

  let stayCount = await Stay.find(query)
  .where('_id').nin(idArray).countDocuments()

  if(page_offset < 0 || typeof parseFloat(page_offset) !== 'number'){page_offset = 0}
  else if(page_offset > Math.floor(stayCount/10)){page_offset = Math.floor(stayCount/10)}

  let stays = await Stay.find(query)
  .sort({ _id: sorts})
  .where('_id').nin(idArray)
  .skip(parseFloat(page_offset)*10)
  .limit(10)

  const title = `Modern Stays.${'All' || location}`;
  const page = 'search';
  res.render('pages/searchResults',{title,stays,page,stayCount,page_offset})

}))
.post(checkStayValidity,wrapAsync(async(req:Request, res: Response)=>{
  const {stay} = res.locals;
  await stay.save();
  req.flash('success', `Successfully added to the listings:  ${stay.title}, ${stay.location}.`)
  res.redirect(`/stays/${stay._id}`);
}));

router.get('/new',isAuthenticated,createNewStay)
router.get('/:id/update',isAuthenticated,wrapAsync(updateStay));

router.route('/:id')
 .get(wrapAsync(async(req:Request, res: Response)=>{
  const {id} = req.params;
  const stay = await Stay.findById(id).select('+bookings')
  .populate({ 
    path: 'reviews',
    options: {sort: { _id: 'desc'} } 
  });
  let {reviews,title,bookings} = stay;
  let page = 'show';
  res.render('pages/show',{title:title+'.MS',stay,page,reviews,reviewErrors,bookErrors,bookings});
  reviewErrors.length = 0;
  bookErrors.length = 0;
}))
.put(checkStayValidity,wrapAsync(async(req:Request, res: Response)=>{
   const {id} = req.params;
   const update = req.body;
   const stay = await Stay.findByIdAndUpdate(id, update).select('+bookings')
   req.flash('success', `Updated your listing:  ${stay.title}, ${stay.location}.`)
   res.redirect(`/stays/${stay._id}`);
}))
.delete(isAuthenticated,wrapAsync(async(req:Request, res: Response)=>{
   const {id} = req.params;
   const stay = await Stay.findByIdAndRemove(id)
   req.flash('info', `${stay.title}, ${stay.location}. have been removed from your listings`)
   res.redirect(`/`);
}))

module.exports = router;