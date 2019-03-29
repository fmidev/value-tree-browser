# Read-only / static version of the arctic observation value tree

This requires NodeJS 8.x and the readme expects you have cloned the repository and have ran `npm install`   

## Building the static version

The static version is built via a shell script that downloads published JSON data from Spatineo's AWS Lambda interface and replaces `src/data/DataSource.js` with a static version of the file.

Process:

```
$ ./get_static_data.sh
$ npm run build
$ cp -r build/ /var/www/html
```

Be careful about committing `src/data/DataSource.js`. You might or might not want to commit that.
