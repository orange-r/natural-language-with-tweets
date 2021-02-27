# natural-language-with-tweets

## アプリ作成時のメモ

### npm init
```
docker run -it --rm --entrypoint npm -v "$PWD":/var/task natural-language-with-tweets init
```

### tsc --init
```
docker run -it --rm --entrypoint ./node_modules/.bin/tsc -v "$PWD":/var/task natural-language-with-tweets --init
```
