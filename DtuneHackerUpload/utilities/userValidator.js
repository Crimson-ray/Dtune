const Joi=require('joi')
 const UserSchema=Joi.object({
    username:Joi.string().required(),
    email:Joi.string().required(),
    password:Joi.string().required().pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one digit, one special character, and be at least 8 characters long.',
      'any.required': 'Password is required.',
      'string.empty': 'Password cannot be empty.',
  })
 }).required()
 
 module.exports=UserSchema