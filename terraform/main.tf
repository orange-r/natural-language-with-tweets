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
  function_name = "lambda_container"
  role          = aws_iam_role.iam_for_lambda.arn
  package_type  = "Image"
  image_uri     = "${data.aws_ecr_repository.lambda_containter.repository_url}:latest"
  timeout       = 600

  lifecycle {
    ignore_changes = [image_uri]
  }

  environment {
    variables = {
      foo = "bar"
    }
  }
}
