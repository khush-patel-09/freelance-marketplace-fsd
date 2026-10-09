// const fs = require("fs");

// const freelancers = JSON.parse(
//     fs.readFileSync("./data/freelancers.json", "utf8")
// );

// const jobs= JSON.parse(
//     fs.readFileSync("./data/freelancers.json", "utf8")
// )

// console.log("Freelancers: ")
// console.log(freelancers)

// console.log("\nJobs: ")
// console.log(jobs)

// single freelancer can have multiple skills and projects -> multidimensional json array
// json data -> freelancers, job listings, clients, proposals 

import app from "./app.js"
app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});