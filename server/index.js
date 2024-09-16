const express = require("express");
const gameRoutes = require("./routes/gameRoutes");

const app = express();
app.use(express.json());
app.use('/', gameRoutes);

app.listen(3000, () => {
  console.log(`Server listening on port 3000`);
});
