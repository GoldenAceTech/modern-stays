import express, {Request, Response, NextFunction} from 'express';
const router = express.Router({mergeParams:true});
import passport from 'passport';
const wrapAsync = require('../utils/wrapAsync');
import { StayModel } from '../models/staySchema';
import { UserModel} from '../models/userSchema';
import { BookModel} from '../models/bookingSchema';
const {checkuserValidity,registerUser}= require('../schemaValidations/userSchemaValidation');
const {isAuthenticated} = require('../middlewares/isAuthenticated');
import {authenticatePost}  from '../middlewares/authenticatePost'

router.route('/register')
.get(registerUser)
.post(checkuserValidity,wrapAsync(async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const { email, username, password } = req.body;
        const user = new UserModel({ email, username });
        UserModel.register(user, password,(err,user) =>{
            if(err) {
                req.flash('error',err.message)
                return res.redirect('/register')
            } 

            passport.authenticate('local')(req, res, function () {
                req.flash('success', `Welcome to Modern Stays, ${username}`);
                let redirectUrl = req.session.returnTo?.replace('/bookings','') || '/'
                res.redirect(redirectUrl);
              });
        });

    } catch (e:any) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
}))

router.route('/login')
.get((req:Request, res: Response)=>{
      const title = 'LogIn';
      const page = 'Login';
      res.render('pages/login',{title,page})
})
.post(passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }),(req:Request,res:Response)=>{
    let username = req.user?.username
    req.flash('success', `Welcome back,  ${username}`);
    let redirectUrl = req.session.returnTo?.replace('/bookings','') || '/'
    res.redirect(redirectUrl);
})

router.get('/logout', function(req, res){
    req.logout();
    req.flash('info','You have been logged out')
    res.redirect('/');
});

router.get('/user',isAuthenticated,wrapAsync(async (req:Request,res:Response) =>{
    let title = `my profile-@${req.user?.username}`
    let myStays = req.user?.stays
    let myBookings = req.user?.bookings
    let stays = await StayModel.find({_id:{$in:myStays}}).select('title location')
    let bookings = await BookModel.find({_id:{$in:myBookings}}).select('lodgeIn lodgeOut').populate('stay','title location')
    let page = 'profile'
    res.render('pages/user',{title,page,stays,bookings})
})) 

router.delete('/user/:userId',authenticatePost,wrapAsync(async (req:Request,res:Response) =>{
    const {userId} = req.params; 
    if(userId != req.user?._id) {
        req.logOut();
        req.flash('info',`Permission denied: You can not delete another user's account`)
        return res.redirect('/');
    }
    await UserModel.findByIdAndRemove(userId);
    req.flash('info','Your account have been deleted')
    res.redirect('/')
})) 
  
module.exports = router