# Description
Genome Importer JS

# Infraestructure
```
docker run -d -p 27017:27017 --name=genome-db -e MONGO_INITDB_ROOT_USERNAME=root -e MONGO_INITDB_ROOT_PASSWORD=password -e MONGO_INITDB_DATABASE=genome mongo:latest
```

# Execution
```
node --max_old_space_size=8048 app.js
```