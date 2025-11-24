sh commit.sh
ng build --configuration loteamento1-prod
gcloud config set account lsouzaus@gmail.com
gcloud config set project lsdevelopers
gcloud app deploy app.loteamento1.yaml