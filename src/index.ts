import needle = require('needle');
import { format, subDays } from 'date-fns'
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
  
  console.debug(event);

  // 'twitterQuery'パラメータが存在しない or 空 の場合はエラー
  let twitterQuery = event.twitterQuery;
  if (typeof twitterQuery === 'undefined' || twitterQuery === null || twitterQuery === '') {
    throw('twitterQuery parameters are required in event.');
  }
  // 'fileName'パラメータが存在しない or 空 の場合、後続処理で(実行日時の) HHmmss.csv とする
  let fileName: string = event.fileName;

  // 現在時刻(Tokyo)
  let utcDate: Date = new Date();
  let jstDate: Date = utcToZonedTime(utcDate, 'Asia/Tokyo');

  console.info(`UTC: ${utcDate}`);
  console.info(`JST: ${jstDate}`);
  let utcYesterday: Date = subDays(new Date(), 1)
  let jstYesterday: Date = utcToZonedTime(utcYesterday, 'Asia/Tokyo');
  console.debug(`JST(yesterday): ${jstYesterday}`);

  console.debug(`S3 Dir: ${format(jstYesterday, 'yyyy-MM', {locale: ja})}`);
  console.debug(`対象日: ${format(jstYesterday, 'yyyy-MM-dd', {locale: ja})}`);
  let since: string = `since:${format(jstYesterday, 'yyyy-MM-dd', {locale: ja})}_00:00:00_JST`;
  let until: string = `until:${format(jstYesterday, 'yyyy-MM-dd', {locale: ja})}_23:59:59_JST`;
  console.debug(since);
  console.debug(until);

  // csv用データ
  let csvRecords: Csv.Record[] = [];

  // Twitterからデータ取得
  try {
    // let since = 'since:2021-03-20_00:00:00_JST';
    // let until = 'until:2021-03-21_00:00:00_JST';
    let q = twitterQuery;
    // let q = `${twitterQuery} exclude:retweets ${since} ${until}`
    // let max_id = '1376436756925480960';
    let max_id = null;
    let twitterOptions ={
      q: q,
      count: 100,
      lang: 'ja',
      locale: 'ja',
      result_type: 'recent',
      max_id: max_id
    };
    console.info('--- twitterOptions ---');
    console.dir(twitterOptions);
    let tweets = await client.get('search/tweets', twitterOptions);
    // let tweets = await client.get('search/tweets', twitterOptions, await function(error: any, tweets: any, response: any) {
    //   console.dir(response);
    //   if(error) throw error;
    //   return tweets;
    // });
    console.info(`getting in this call: ${tweets.statuses.length}`);
    if (tweets.search_metadata == undefined) {
      console.info('---- Complete (no metadata) ----');
      // return 0;
    }
    else if (tweets.search_metadata.next_results) {
      let maxId = tweets.search_metadata.next_results.match(/\?max_id=(\d*)/);
      console.info(`max_id: ${maxId}`);

      if (maxId[1] == null) {
        // return 0;
      }

      console.info('---- next:' + maxId[1] + ' ----');
      // searchTweet(queryArg, maxId[1]);
    }
    else {
      console.info('---- Complete ----');
      // return 0;
    }
    for (let tweet of tweets.statuses) {

      // The text to analyze
      let text;
      try {
        text = decodeURI(tweet.text);
      } catch (error) {
        console.warn(`ERROR: decodeURI(${tweet.text})`);
        console.warn(error, error.stack);
        text = tweet.text;
      }
      
      const document = {
        content: text,
        type: 'PLAIN_TEXT',
      };
      
      // Detects the sentiment of the text
      const [result] = await gcpClient.analyzeSentiment({document: document});
      const sentiment = result.documentSentiment;
      
      let dateFormat = 'yyyy/MM/dd HH:mm:ss'
      let csvRecord: Csv.Record = {
        created_at: format(utcToZonedTime(new Date(tweet.created_at), 'Asia/Tokyo'), dateFormat, {locale: ja}),
        text:       text,
        retweet_count: tweet.retweet_count,
        favorite_count: tweet.favorite_count,
        user_followers_count: tweet.user.followers_count,
        location: tweet.user.location,
        place: tweet.place,
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
      created_at: 'created at',                     // ツイート日時
      text: 'text',                                 // ツイート内容
      retweet_count: 'retweet_count',               // リツイート数
      favorite_count: 'favorite_count',             // いいね数
      user_followers_count: 'user_followers_count', // ツイートした人のフォロワー数
      location: 'user location',
      place: 'twieet place',
      sentiment_score: 'sentiment_score',
      sentiment_magnitude: 'sentiment_magnitude',
    },
  }

  let s3Body = '';
  try {
    s3Body = await csvStringify(csvRecords, csvOptions);
  } catch(error) {
    console.warn('ERROR: csvSringify');
    console.warn(error, error.stack);
    throw error;
  }

  // S3へ書き出す(yyyy-MM/file_name.csv)
  let filePath: string = format(jstYesterday, 'yyyy-MM', {locale: ja});
  if (fileName === null || fileName === undefined) {
    fileName = `${format(jstDate, 'HHmmss', {locale: ja})}.csv`;
  }
  await uploadToS3(s3Body, fileName, filePath);


  return ('Hello from Lambda with Typescript');
}

async function uploadToS3(body: string, fileName: string, filePath: string): Promise<void> {
  let destparams = await s3CsvDestParams(body, fileName, filePath)
  try {
    let putResult = await s3.putObject(destparams).promise();
    console.debug(putResult);
  } catch(error) {
    console.warn('ERROR: S3 put Object');
    console.warn(error, error.stack);
    throw error;
  }
};

async function s3CsvDestParams(body: string, fileName: string, filePath: string) {
  return {
    Bucket: 'natural-language-with-tweets',
    Key: `${filePath}/${fileName}`,
    Body: body,
    ContentType: 'text/csv'
  };
};
