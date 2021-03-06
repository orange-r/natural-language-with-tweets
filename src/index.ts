import needle = require("needle");
import { format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { ja } from 'date-fns/locale'

// AWS
// let AccessKeyId = process.env.AWS_ACCESS_KEY_ID
// let SecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
let aws = require('aws-sdk')
const s3 = new aws.S3()

// Twitter
let token = process.env.BEARER_TOKEN;
let endpointUrl = "https://api.twitter.com/2/tweets/search/recent";

exports.handler = async (event: any, context: any, callback: Function) => {
  // 現在時刻(Tokyo)
  let utcDate: Date = new Date();
  let jstDate: Date = utcToZonedTime(utcDate, 'Asia/Tokyo');

  console.info(`UTC: ${utcDate}`);
  console.info(`JST: ${jstDate}`);

  console.info(token);

  let params = {
    'query': 'from:twitterdev -is:retweet',
    'tweet.fields': 'author_id'
  }

  let headers = {
      "User-Agent": "v2RecentSearchJS",
      "authorization": `Bearer ${token}`
    }

  needle('get', endpointUrl, params, { headers: headers })
  .then( (response: needle.NeedleResponse) => {
    console.info(response.body);
  })
  .catch( (err: any) => {
    throw new Error('Unsuccessful request');
  })

  // TODO: S3へ書き出す(yyyy-mm-dd/)
  let destparams = {
    Bucket: 'natural-language-with-tweets',
    Key: `${format(jstDate, 'yyyy-MM-dd', {locale: ja})}/file.text`,
    Body: "test",
    ContentType: 'text/plain'
  };

  try {
    let putResult = await s3.putObject(destparams).promise();
     console.log(putResult);
  } catch(err) {
     console.warn(err, err.stack);
  }


  return ('Hello from Lambda with Typescript');
}
