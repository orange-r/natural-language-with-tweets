namespace Csv {
    export interface Record {
      created_at: string;
      text: string;
      retweet_count: string;
      favorite_count: string;
      user_followers_count: string;
      location: string;
      place: any;
      sentiment_score: number;
      sentiment_magnitude: number;
    }
}
