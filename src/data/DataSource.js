import { API } from "aws-amplify";

export async function getValuetree(id) {
    return API.get("valuetrees", `/public/valuetrees/${id}`);
}

export async function valuetrees() {
    return API.get("valuetrees", "/public/valuetrees");
}