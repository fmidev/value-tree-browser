#!/bin/bash

set -e

ENDPOINT="https://fr0d428t3g.execute-api.eu-west-1.amazonaws.com/dev/public"

LIST_FILE=$(mktemp)
VALUETREE_DIR=$(mktemp -d)

wget -O $LIST_FILE --quiet $ENDPOINT/valuetrees

for ID in $(cat $LIST_FILE | jq -r .[].valuetreeId); do
    wget -O $VALUETREE_DIR/$ID --quiet $ENDPOINT/valuetrees/$ID
done

cat <<EOF > src/data/DataSource.js
const treelist = $(cat $LIST_FILE);
const trees = {
$(
for ID in $(cat $LIST_FILE | jq -r .[].valuetreeId); do
    echo -n '    "'$ID'": ';
    cat $VALUETREE_DIR/$ID;
    echo ',';
done
)
};

export async function getValuetree(id) {
    return trees[id];
}

export async function valuetrees() {
    return treelist;
}
EOF

rm $LIST_FILE
rm -r $VALUETREE_DIR
