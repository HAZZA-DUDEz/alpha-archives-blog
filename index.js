import express from "express";
import bodyParser from "body-parser";
import session from "express-session";

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-only",
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.username || null;
  res.locals.formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  next();
});

const users = []; // { username, password, avatar, favVersion, createdAt? }

const posts = [
  {
    id: 1,
    title: "Bee Mod?",
    subject: "Mods",
    imageUrl: "/images/default-post.png",
    content:
      "I’ve been looking for a Bee mod for Minecraft Alpha, does anyone know one or can anyone make one?",
    author: "WanderingTrader",
    authorAvatar: "/avatars/default.png",
    alphaVersion: "Alpha 1.2.6",
    createdAt: new Date(),
    isTrending: true,
  },
];

function requireLogin(req, res, next) {
  if (!req.session.username) {
    return res.redirect("/auth");
  }
  next();
}

app.get("/", (req, res) => {
  const trendingPost = posts.find((p) => p.isTrending) || null;
  res.render("start", {
    pageTitle: "Alpha Archives",
    pageCss: "/styles/start.css",
    trendingPost,
  });
});

app.get("/about", (req, res) => {
  res.render("about", {
    pageTitle: "About - Alpha Archives",
    pageCss: "/styles/about.css",
  });
});

app.get("/blogs", (req, res) => {
  const trendingPost = posts.find((p) => p.isTrending) || null;
  const otherPosts = trendingPost
    ? posts.filter((p) => p.id !== trendingPost.id)
    : posts;
  res.render("index", {
    pageTitle: "Blogs - Alpha Archives",
    pageCss: "/styles/blogs.css",
    trendingPost,
    posts: otherPosts,
  });
});

app.get("/auth", (req, res) => {
  res.render("auth", {
    pageTitle: "Account - Alpha Archives",
    pageCss: "/styles/auth.css",
  });
});

app.get("/account", requireLogin, (req, res) => {
  const user = users.find((u) => u.username === req.session.username);
  const userPosts = posts.filter((p) => p.author === req.session.username);
  res.render("account", {
    pageTitle: "My Account - Alpha Archives",
    pageCss: "/styles/account.css",
    user,
    userPosts,
  });
});

app.get("/posts/:id", (req, res) => {
  const postId = Number(req.params.id);
  const post = posts.find((p) => p.id === postId);
  if (!post) {
    return res.status(404).render("404", {
      pageTitle: "404 - Post Not Found",
      pageCss: "/styles/404.css",
    });
  }
  res.render("post", {
    pageTitle: post.title,
    pageCss: "/styles/post.css",
    post,
  });
});

app.get("/signup", (req, res) => {
  res.render("signup", {
    pageTitle: "Create Account",
    pageCss: "/styles/signup.css",
    error: null,
  });
});

app.post("/signup", (req, res) => {
  const { username, password, avatar, favVersion } = req.body;
  if (!username || !password) {
    return res.render("signup", {
      pageTitle: "Create Account",
      pageCss: "/styles/signup.css",
      error: "Please fill in all fields.",
    });
  }
  if (users.find((u) => u.username === username)) {
    return res.render("signup", {
      pageTitle: "Create Account",
      pageCss: "/styles/signup.css",
      error: "That username is already taken.",
    });
  }
  users.push({ username, password, avatar, favVersion, createdAt: new Date() });
  req.session.username = username;
  res.redirect("/blogs");
});

app.get("/login", (req, res) => {
  res.render("login", {
    pageTitle: "Login",
    pageCss: "/styles/login.css",
    error: null,
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) {
    return res.render("login", {
      pageTitle: "Login",
      pageCss: "/styles/login.css",
      error: "Invalid username or password.",
    });
  }
  req.session.username = username;
  res.redirect("/blogs");
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});


app.get("/compose", requireLogin, (req, res) => {
  const user = users.find((u) => u.username === req.session.username);
  res.render("compose", {
    pageTitle: "New Post",
    pageCss: "/styles/compose.css",
    user, // ✅
  });
});

app.post("/compose", requireLogin, (req, res) => {
  const { title, subject, imageUrl, content, alphaVersion } = req.body;
  const user = users.find((u) => u.username === req.session.username);

  const newPost = {
    id: posts.length + 1,
    title,
    subject,
    imageUrl: imageUrl && imageUrl.trim() ? imageUrl : "/images/default-post.png",
    content,
    author: user ? user.username : "WanderingTrader",
    authorAvatar: user ? `/avatars/${user.avatar}.png` : "/avatars/default.png",
    alphaVersion: alphaVersion || "Alpha",
    createdAt: new Date(),
    isTrending: false,
  };
  posts.unshift(newPost);
  res.redirect("/blogs");
});

app.get("/users/:username", (req, res) => {
  const user = users.find((u) => u.username === req.params.username);
  if (!user) {
    return res.status(404).render("404", {
      pageTitle: "404 - User Not Found",
      pageCss: "/styles/404.css",
    });
  }
  const userPosts = posts.filter((p) => p.author === user.username);
  res.render("profile", {
    pageTitle: `${user.username}'s Profile`,
    pageCss: "/styles/profile.css",
    user,
    userPosts,
  });
});

app.use((req, res) => {
  res.status(404).render("404", {
    pageTitle: "404 - Page Not Found",
    pageCss: "/styles/404.css",
  });
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});