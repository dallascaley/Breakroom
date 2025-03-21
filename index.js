const express = require('express');
const app = express();
const port = 80;

app.get('/', (req, res) => {
  res.send('Hello World! <br/><br/>Version 0.0.1');
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});