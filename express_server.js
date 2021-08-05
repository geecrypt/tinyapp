// TODO: use custom log message format with colorizing
// TODO: DRY up templateVars usage
// TODO: style Register and Login buttons in nav better, + they should go into burger
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const inspect = require("util").inspect;

const app = express();
const PORT = 8080;
const urlDatabase = {
  "test2": {
    longURL: "http://www.lighthouselabs.ca",
    userId: "userRandomID"
  },
  "test1":{
    longURL: "http://www.google.com",
    userId: "123"
  }
};
const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  },
  "123": {
    id: "123",
    email: "test@test.com",
    password: "test"
  }
};

// TODO: use better RNG and generate capital letters
const generateRandomString = () => {
  return Math.random().toString(36).replace(/[^a-z0-9]+/g, '').substr(0, 6);
};

const idFromEmail = email => {
  for (const userId in users) {
    if (users[userId].email === email) {
      return userId;
    }
  }

  return undefined;
};

const urlsForUser = id => {
  const userUrls = {};

  for (const url in urlDatabase) {
    if (urlDatabase[url].userId === id) {
      userUrls[url] = urlDatabase[url];
    }
  }

  return userUrls;
};

const urlBelongsToUser = (url, id) => {
  for (const usersUrl in urlsForUser(id)) {
    if (url === usersUrl) {
      return true;
    }
  }

  return false;
};

app.set("view engine", "ejs");

app.use(express.urlencoded({extended: true}));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.static('public'));

app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls", (req, res) => {
  let errorMessage = undefined;
  if (!req.cookies.user_id) {
    errorMessage = "You must be logged in to see this";
  }

  const templateVars = {
    urls: urlsForUser(req.cookies.user_id),
    user: users[req.cookies.user_id],
    errorMessage,
    button: "login"
  };

  if (errorMessage) {
    return res.status(403).render("error", templateVars);
  }

  res.render("urls_index", templateVars);
});

app.get("/register", (req, res) => {
  if (req.cookies.user_id) {
    return res.redirect("/urls");
  }

  const templateVars = {user: users[req.cookies.user_id]};
  res.render("register", templateVars);
});

app.get("/login", (req, res) => {
  if (req.cookies.user_id) {
    return res.redirect("/urls");
  }

  const templateVars = {user: users[req.cookies.user_id]};
  res.render("login", templateVars);
});

// Create new URL
app.post("/urls", (req, res) => {
  if (!req.cookies.user_id) {
    return res.sendStatus(403);
  }

  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userId: req.cookies.user_id
  };
  console.log(`New URL stored: { ${shortURL} : ${inspect(urlDatabase[shortURL])}}`);

  res.redirect(`urls/${shortURL}`);
});

app.get("/urls/new", (req, res) => {
  let errorMessage = undefined;
  if (!req.cookies.user_id) {
    errorMessage = "You must be logged in to see this";
  }

  const templateVars = {
    user: users[req.cookies.user_id],
    errorMessage,
    button: "login"
  };

  if (errorMessage) {
    return res.status(403).render("error", templateVars);
  }

  res.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  let errorMessage = undefined;
  let button = undefined;

  if (!urlDatabase[shortURL]) {
    return res.redirect("/404");
  }

  if (!req.cookies.user_id) {
    errorMessage = "You must be logged in to see this";
    button = "login";
  } else if (!urlBelongsToUser(shortURL, req.cookies.user_id)) {
    errorMessage = "You do not have permission to edit this URL";
    button = "urls";
  }

  const templateVars = {
    shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    user: users[req.cookies.user_id],
    errorMessage,
    button
  };

  if (errorMessage) {
    return res.status(403).render("error", templateVars);
  }

  res.render("urls_show", templateVars);
});

// Edit longURL for a given shortURL
app.post("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  let errorMessage = undefined;
  let button = undefined;

  if (!urlDatabase[shortURL]) {
    return res.redirect("/404");
  }

  if (!req.cookies.user_id) {
    errorMessage = "You must be logged in to see this";
    button = "login";
  } else if (!urlBelongsToUser(shortURL, req.cookies.user_id)) {
    errorMessage = "You do not have permission to edit this URL";
  }

  const templateVars = {
    shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    user: users[req.cookies.user_id],
    errorMessage,
    button
  };

  if (errorMessage) {
    return res.status(403).render("error", templateVars);
  }

  // TODO: url input validation
  urlDatabase[req.params.shortURL].longURL = req.body.longURL;

  console.log(`URL for ${req.params.shortURL} changed to ${req.body.longURL}`);

  res.redirect(303, `/urls/${req.params.shortURL}`);
});

// Delete URL
app.post("/urls/:shortURL/delete", (req, res) => {
  // TODO: DRY this up, also used in POST, GET /urls/:shortURL
  const shortURL = req.params.shortURL;
  let errorMessage = undefined;
  let button = undefined;

  if (!urlDatabase[shortURL]) {
    return res.redirect("/404");
  }

  if (!req.cookies.user_id) {
    errorMessage = "You must be logged in to see this";
    button = "login";
  } else if (!urlBelongsToUser(shortURL, req.cookies.user_id)) {
    errorMessage = "You do not have permission to edit this URL";
  }

  const templateVars = {
    shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    user: users[req.cookies.user_id],
    errorMessage,
    button
  };

  if (errorMessage) {
    return res.status(403).render("error", templateVars);
  }

  delete urlDatabase[req.params.shortURL];

  console.log(`URL for ${req.params.shortURL} was deleted`);

  res.redirect(303, "/urls");
});

app.get("/u/:shortURL", (req, res) => {
  const url = urlDatabase[req.params.shortURL];

  if (!url) {
    // TODO: DRY this up
    return res.redirect("/404");
  }

  res.redirect(url.longURL);
});

// Login user
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const userId = idFromEmail(email);
  let errorMessage = undefined;

  if (!userId || !password || users[userId].password !== password) {
    errorMessage = `Email or password incorrect`;
  }

  const templateVars = {
    user: users[req.cookies.user_id],
    errorMessage,
    button: "login"
  };

  if (errorMessage) {
    return res.status(403).render("error", templateVars);
  }

  console.log(`User login: ${email}`);

  res.cookie("user_id", userId);
  res.redirect("/urls");
});

// Logout user
app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/login");
});

// Register new user
app.post("/register", (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  let errorMessage = undefined;

  if (!email || !password) {
    errorMessage = "Please provide a valid email and password";
  }

  if (idFromEmail(email)) {
    errorMessage = "This email is already taken";
  }

  const templateVars = {
    user: users[req.cookies.user_id],
    errorMessage,
    button: "register"
  };

  if (errorMessage) {
    return res.status(400).render("error", templateVars);
  }

  users[id] = {
    id,
    email,
    password
  };

  console.log(`New user registered: ${inspect(users[id])}`);

  res.cookie("user_id", id);
  res.redirect("/urls");
});

// 404 handler
app.use("*", (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    user: users[req.cookies.user_id]
  };
  res.status(404).render("404", templateVars);
});

app.listen(PORT, () => {
  console.log(`tinyapp listening on port ${PORT}`);
});
