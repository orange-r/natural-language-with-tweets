terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
  backend "s3" {
    bucket = "terraform-tfstate-group"
    region = "ap-northeast-1"
    key = "natural-language-with-tweets/terraform.tfstate"
  }
}

provider "aws" {
  region = "ap-northeast-1"
}

# lambdaに使用するコンテナイメージの保存先
data "aws_ecr_repository" "lambda_containter" {
  name = "natural-language-with-tweets"
}

resource "aws_iam_role" "iam_for_lambda" {
  # name = "" # If omitted, Terraform will assign a random, unique name.
  assume_role_policy = file("files/iam-role.json")
}

resource "aws_iam_role_policy" "iam_for_lambda" {
  # name = "" # If omitted, Terraform will assign a random, unique name.
  role = aws_iam_role.iam_for_lambda.id
  policy = file("files/iam-policy.json")
}

resource "aws_lambda_function" "default" {
  function_name = "natural-language-with-tweets"
  role          = aws_iam_role.iam_for_lambda.arn
  package_type  = "Image"
  image_uri     = "${data.aws_ecr_repository.lambda_containter.repository_url}:latest"
  timeout       = 900

  lifecycle {
    ignore_changes = [image_uri]
  }

  environment {
    variables = {
      Opportunity = "k-edo"
    }
  }
}

# CloudWatch Eventsの設定
resource "aws_cloudwatch_event_rule" "default" {
  name                = "natural-language-with-tweets"
  description         = "毎日 PM 9:00(JST)に実行"
  schedule_expression = "cron(0 12 * * ? *)"
}

resource "aws_cloudwatch_event_target" "query1" {
  rule      = aws_cloudwatch_event_rule.default.name
  arn       = aws_lambda_function.default.arn
  input     = "{\"twitterQuery\":\"三代 #ボクシング exclude:retweets\", \"fileName\":\"三代_#ボクシング.csv\"}"
}
resource "aws_cloudwatch_event_target" "query2" {
  rule      = aws_cloudwatch_event_rule.default.name
  arn       = aws_lambda_function.default.arn
  input     = "{\"twitterQuery\":\"三代 #ボクサー exclude:retweets\", \"fileName\":\"三代_#ボクサー.csv\"}"
}

# CloudWatch EventsからLambdaを呼び出せるように設定
resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.default.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.default.arn
}
