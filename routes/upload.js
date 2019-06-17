const express = require('express');
const router = express.Router();
const models = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require("fs");
const Sharp = require('sharp');
const mkdirp = require('mkdirp');
const config = require('../config/app');
const mailer =require('../config/mailer');
const diskStorage =require('../utils/diskStorage');

function Delete(path){
   fs.unlink("/node/p"+path, function(err){
      if (err) {
          console.log(err);
      } else {
          console.log("Файл удалён");
      }
  });
}; 

const storage = diskStorage({
  destination:(req,res,cb)=>{
    const user_path = req.session.userId;
    const dir ='/'+ user_path + '/' ;
    req.dir = dir;
    mkdirp(config.DESTINATION + dir, err=>cb(err,config.DESTINATION + dir));
  },
  filename:async(req,file,cb)=>{
    const user_id = req.session.userId;
    const filename = Date.now() + path.extname(file.originalname);
    const dir = req.dir;

    if(req.params.type == 'shortImg'){

    const img = await models.File.findOne({user:user_id,_id:req.params.id}).sort({_id:-1});
    await models.File.findOneAndUpdate({_id:img._id},{
      imgshort:'/uploads' + dir  + filename,
    });
      }else if (req.params.type == 'avatar') {
        const user = await models.User.findOne({_id:req.session.userId});

        await Delete(user.image);

        await models.User.findOneAndUpdate({_id:req.session.userId},{
          image:'/uploads' + dir  + filename,
        });
      }else{
        try {
          await models.File.create({
              user:user_id,
              path:'/uploads' + dir  + filename,
              imgshort:'/uploads' + dir  + filename,
          });
        } catch (e) {
          console.log(e);
        }
      }

    cb(null,filename);
  },
  sharp:(req,file,cb)=>{
    const resizer = Sharp()
    .resize(800, 600, {
      fit: Sharp.fit.inside,
      withoutEnlargement: true
    })
    .toFormat('jpg')
    .jpeg({
      quality:40,
      progressive:true
    });
    cb(null, resizer);
  }
});

const upload = multer({
  storage,
  limits:{fileSize: 10*1024*1024},
  fileFilter:(req,file,cb)=>{
    const ext = path.extname(file.originalname);
    if(ext !=='.jpg' && ext !=='.png' && ext !=='.jpeg' && ext !=='.JPG'){
      const err = new Error('Extention')
      err.code = 'EXTENTION';
      return cb(err)
    }
    cb(null, true)
  }
}).single('file');

router.post('/upload/:type/:id',async (req,res)=>{
  const userId = req.session.userId;
  const count = await models.File.find({user:userId}).countDocuments();
  if(count <= 20 ){
      upload(req, res, err =>{
    let error = '';
    if(err){
      if(err.code === 'LIMIT_FILE_SIZE'){
        error = "Изображение превышает лимит"
      }
      if(err.code === 'EXTENTION'){
        error = 'Неверный формат данных'
      }
    }
    res.json({
      ok:!!error,
      error:error
    });
  });
  }else{
    res.json({
      ok:false,
      error:'Лимит загружаемых фотографий превышен'
    });
  }
});

router.delete('/deleteimage/:id', async (req,res)=>{
  const id_image = req.params.id;
  const file = await models.File.findOne({_id:req.params.id});

  await models.File.findByIdAndDelete(req.params.id, function(err){
        if(err) return console.log(err);
  });

  await Delete(file.path);
  await Delete(file.imgshort);
});

module.exports = router;