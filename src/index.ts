import needle = require('needle');
import { format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { ja } from 'date-fns/locale'

// const csvStringify = require('csv-stringify');
const csvStringify = require('csv-stringify/lib/sync');

// AWS
// let AccessKeyId = process.env.AWS_ACCESS_KEY_ID
// let SecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
let aws = require('aws-sdk')
const s3 = new aws.S3()

// Twitter
const Twitter = require('twitter')
const client = new Twitter({
  consumer_key        : process.env.API_KEY ,           // consumer keyを記入
  consumer_secret     : process.env.API_KEY_SECRET,     // consumer secretを記入
  access_token_key    : process.env.ACCESS_TOKEN,       // access tokenを記入
  access_token_secret : process.env.ACCESS_TOKEN_SECRET // access token secretを記入
});
let token = process.env.BEARER_TOKEN;
let endpointUrl = 'https://api.twitter.com/2/tweets/search/recent';

// GCP
// Imports the Google Cloud client library
const gcpLanguage = require('@google-cloud/language')
// Instantiates a client
const gcpClient = new gcpLanguage.LanguageServiceClient();


// called function
exports.handler = async (event: any, context: any, callback: Function) => {
  // 現在時刻(Tokyo)
  let utcDate: Date = new Date();
  let jstDate: Date = utcToZonedTime(utcDate, 'Asia/Tokyo');

  console.info(`UTC: ${utcDate}`);
  console.info(`JST: ${jstDate}`);

  // csv用データ
  let csvRecords: Csv.Record[] = [];

  // let params = {
  //   'query': 'from:twitterdev -is:retweet',
  //   'tweet.fields': 'author_id'
  // }

  // let headers = {
  //     'User-Agent': 'v2RecentSearchJS',
  //     'authorization': `Bearer ${token}`
  //   }

  // needle('get', endpointUrl, params, { headers: headers })
  // .then( (response: needle.NeedleResponse) => {
    // console.info(response.body);
  // })
  // .catch( (err: any) => {
    // throw new Error('Unsuccessful request');
  // })

  // Twitterからデータ取得
  try {
    let tweets = await client.get('search/tweets', { q: '魔王さま exclude:retweets', count: 3, lang: 'ja', locale: 'ja', result_type: 'recent' , max_id: null} );
    console.log('--- each tweet of tweets ---');
    for (let tweet of tweets.statuses) {
      // let csvRecord: Csv.Record = {
      //   created_at: tweet.created_at,
      //   text:       decodeURI(tweet.text)
      // }
      // csvRecords.push(csvRecord)

      // The text to analyze
      const text = decodeURI(tweet.text);
      
      const document = {
        content: text,
        type: 'PLAIN_TEXT',
      };
      
      // Detects the sentiment of the text
      const [result] = await gcpClient.analyzeSentiment({document: document});
      const sentiment = result.documentSentiment;
      
      console.log(`Text: ${text}`);
      console.log(`Sentiment score: ${sentiment.score}`);
      console.log(`Sentiment magnitude: ${sentiment.magnitude}`);
      console.log(typeof sentiment.score);
      console.log(typeof sentiment.magnitude);

      let dateFormat = 'yyyy/MM/dd hh:mm:ss'
      let csvRecord: Csv.Record = {
        created_at: format(utcToZonedTime(new Date(tweet.created_at), 'Asia/Tokyo'), dateFormat, {locale: ja}),
        text:       decodeURI(tweet.text),
        sentiment_score: sentiment.score,
        sentiment_magnitude: sentiment.magnitude,
      }
      csvRecords.push(csvRecord)
    }
  } catch (error) {
    console.warn('ERROR: Twitter.client.get');
    console.warn(error, error.stack);
    throw error;
  }

  // CSV作成
  const csvOptions = {
    quoted_string: true,
    header: true,
    columns: {
      created_at: 'created at',
      text: 'text',
      sentiment_score : 'sentiment_score',
      sentiment_magnitude: 'sentiment_magnitude',
    },
  }

  let csvString = '';
  try {
    csvString = await csvStringify(csvRecords, csvOptions);
    console.log(csvString);
  } catch(error) {
    console.warn('ERROR: csvSringify');
    console.warn(error, error.stack);
    throw error;
  }
  console.log(csvString);

  // S3へ書き出す(yyyy-mm-dd/)
  let destparams = {
    Bucket: 'natural-language-with-tweets',
    Key: `${format(jstDate, 'yyyy-MM-dd', {locale: ja})}/file.csv`,
    Body: csvString,
    ContentType: 'text/csv'
  };

  try {
    let putResult = await s3.putObject(destparams).promise();
    console.log(putResult);
  } catch(error) {
    console.warn('ERROR: S3 put Object');
    console.warn(error, error.stack);
    throw error;
  }


  return ('Hello from Lambda with Typescript');
}
