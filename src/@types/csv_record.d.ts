namespace Csv {
    export interface Record {
      created_at: string;
      text: string;
      sentiment_score: number;
      sentiment_magnitude: number;
    }
}
