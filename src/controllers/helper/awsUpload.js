const aws = require('aws-sdk');

aws.config.update({
  accessKeyId: 'AKIAY3L35MCRVFM24Q7U',
  secretAccessKey: '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',
  region: 'ap-south-1',
});

const uploadFile = async (file) => new Promise((resolve, reject) => {
  const s3 = new aws.S3({ apiVersion: '2006-03-01' });

  const uploadParams = {
    ACL: 'public-read',
    Bucket: 'classroom-training-bucket',
    Key: `mubashir/${file.originalname}`,
    Body: file.buffer,
  };

  s3.upload(uploadParams, (err, data) => {
    if (err) {
      return reject(err);
    }
    console.log('file uploaded succesfully');
    return resolve(data.Location);
  });
});

module.exports = { uploadFile };
