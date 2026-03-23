import { FilePattern, PriorityTier, TechDefinition } from "./types";

export const CONCURRENCY_LIMIT = 16;
export const MAX_RETRIES = 5;
export const MAX_GENERATE_FILE_PRELOADED_TOKENS = 30_000;
export const MAX_STRUCTURE_PRELOADED_TOKENS = 50_000;
export const TOKENIZER_MODEL = "gpt-4o";
export const MAX_TREE_ITEMS = 1000;
export const TIERS: PriorityTier[] = [1, 2, 3, 4, 5];
export const UNIVERSAL_PATTERNS: FilePattern[] = [
  {
    tier: 1,
    globs: ["README.md"],
  },
];
export const WALK_EXCLUSIONS = new Set([
  // Build/output directories
  "dist", "build", "out", "bin", "obj", "target",
  ".next", ".nuxt", ".output", ".svelte-kit",
  // Dependency/cache directories
  "node_modules", "bower_components", "vendor",
  "venv", "env", ".venv",
  ".tox", ".mypy_cache", ".pytest_cache", ".ruff_cache",
  ".yarn", ".pnp.cjs", ".pnp.loader.mjs",
  // IDE/editor directories
  ".idea", ".vscode",
  // Other generated/temporary
  "__pycache__", "coverage",
  ".terraform", ".cache", ".turbo", ".nx",
  ".parcel-cache", ".docusaurus",
  "tmp", ".tmp", "logs",
]);
export const TECH_REGISTRY: TechDefinition[] = [
  {
    id: "javascript-typescript",
    name: "JavaScript/TypeScript",
    patterns: [
      {
        tier: 1, 
        globs: ["package.json", "tsconfig.json", "tsconfig.*.json"],
      },
      {
        tier: 2, 
        globs: [
          "index.ts", "index.js",
          "main.ts", "main.js",
          "app.ts", "app.js",
          "server.ts", "server.js",
          "src/index.ts", "src/index.js",
          "src/main.ts", "src/main.js",
          "src/app.ts", "src/app.js",
          "src/server.ts", "src/server.js",
        ],
      },
      {
        tier: 3, 
        globs: [
          "src/types.ts", "src/types/index.ts",
          "src/**/types.ts", "src/**/types/index.ts",
          "src/**/models.ts", "src/**/models/index.ts",
          "src/**/interfaces.ts",
          "src/**/schema.ts", "src/**/schemas.ts",
        ],
      },
      {
        tier: 4, 
        globs: [
          "src/**/routes.ts", "src/**/routes.js",
          "src/**/router.ts", "src/**/router.js",
          "src/**/api.ts", "src/**/api.js",
          "src/**/endpoints.ts",
        ],
      },
      {
        tier: 5, 
        globs: [
          "src/lib/index.ts", "src/core/index.ts",
          "src/utils/index.ts", "src/services/index.ts",
          "src/config.ts", "src/config/index.ts",
        ],
      },
    ],
  },

  {
    id: "react",
    name: "React.js",
    patterns: [
      {
        tier: 1, 
        globs: [
          "vite.config.ts", "vite.config.js",
          "webpack.config.ts", "webpack.config.js",
          "craco.config.ts", "craco.config.js",
        ],
      },
      {
        tier: 2, 
        globs: [
          "src/index.tsx", "src/main.tsx",
          "src/App.tsx", "src/App.ts",
          "src/App.jsx", "src/App.js",
        ],
      },
      {
        tier: 3, 
        globs: [
          "src/store.ts", "src/store/index.ts",
          "src/**/store.ts", "src/**/store/index.ts",
          "src/context/**/*.tsx", "src/context/**/*.ts",
        ],
      },
      {
        tier: 4, 
        globs: [
          "src/routes.tsx", "src/router.tsx",
          "src/routes/index.tsx", "src/router/index.tsx",
        ],
      },
    ],
  },

  {
    id: "nextjs",
    name: "Next.js",
    patterns: [
      {
        tier: 1, 
        globs: [
          "next.config.ts", "next.config.js", "next.config.mjs",
        ],
      },
      {
        tier: 2, 
        globs: [
          "src/app/layout.tsx", "app/layout.tsx",
          "src/app/page.tsx", "app/page.tsx",
          "src/pages/_app.tsx", "pages/_app.tsx",
          "src/pages/_document.tsx", "pages/_document.tsx",
          "middleware.ts", "src/middleware.ts",
        ],
      },
      {
        tier: 4,
        globs: [
          "src/app/api/**/route.ts", "app/api/**/route.ts",
          "src/pages/api/**/*.ts", "pages/api/**/*.ts",
        ],
      },
    ],
  },

  {
    id: "vue",
    name: "Vue.js",
    patterns: [
      {
        tier: 1, 
        globs: [
          "vite.config.ts", "vite.config.js",
          "vue.config.js", "nuxt.config.ts", "nuxt.config.js",
        ],
      },
      {
        tier: 2,
        globs: [
          "src/main.ts", "src/main.js",
          "src/App.vue",
        ],
      },
      {
        tier: 3, 
        globs: [
          "src/store/index.ts", "src/store/index.js",
          "src/stores/**/*.ts",
          "src/pinia/**/*.ts",
        ],
      },
      {
        tier: 4,
        globs: [
          "src/router/index.ts", "src/router/index.js",
          "src/router.ts",
        ],
      },
    ],
  },

  {
    id: "angular",
    name: "Angular",
    patterns: [
      {
        tier: 1, 
        globs: ["angular.json", "tsconfig.app.json"],
      },
      {
        tier: 2, 
        globs: [
          "src/main.ts",
          "src/app/app.module.ts",
          "src/app/app.component.ts",
        ],
      },
      {
        tier: 4, 
        globs: [
          "src/app/app-routing.module.ts",
          "src/app/app.routes.ts",
        ],
      },
      {
        tier: 5, 
        globs: [
          "src/app/core/**/*.ts",
          "src/app/shared/**/*.ts",
        ],
      },
    ],
  },

  {
    id: "python",
    name: "Python",
    patterns: [
      {
        tier: 1, 
        globs: [
          "pyproject.toml", "setup.py", "setup.cfg",
          "requirements.txt", "Pipfile",
        ],
      },
      {
        tier: 2, 
        globs: [
          "main.py", "app.py", "__main__.py",
          "manage.py", "wsgi.py", "asgi.py",
          "src/main.py", "src/app.py",
          "src/__main__.py",
        ],
      },
      {
        tier: 3, 
        globs: [
          "**/models.py", "**/models/**/*.py",
          "**/schemas.py", "**/schema.py",
          "**/config.py", "**/settings.py",
        ],
      },
      {
        tier: 4,
        globs: [
          "**/urls.py", "**/routes.py",
          "**/api.py", "**/views.py",
          "**/endpoints.py",
        ],
      },
      {
        tier: 5, 
        globs: [
          "**/core/**/*.py",
          "**/utils.py", "**/helpers.py",
          "**/services/**/*.py",
        ],
      },
    ],
  },

  {
    id: "java",
    name: "Java",
    patterns: [
      {
        tier: 1, 
        globs: [
          "pom.xml", "build.gradle", "build.gradle.kts",
          "settings.gradle", "settings.gradle.kts",
          "application.yml", "application.yaml", "application.properties",
          "src/main/resources/application.yml",
          "src/main/resources/application.yaml",
          "src/main/resources/application.properties",
        ],
      },
      {
        tier: 2, 
        globs: [
          "**/*Application.java",
          "**/Main.java",
          "**/App.java",
        ],
      },
      {
        tier: 3, 
        globs: [
          "**/model/**/*.java",
          "**/entity/**/*.java",
          "**/dto/**/*.java",
        ],
      },
      {
        tier: 4, 
        globs: [
          "**/controller/**/*.java",
          "**/resource/**/*.java",
          "**/api/**/*.java",
        ],
      },
      {
        tier: 5, 
        globs: [
          "**/service/**/*.java",
          "**/config/**/*.java",
        ],
      },
    ],
  },

  {
    id: "go",
    name: "Go",
    patterns: [
      {
        tier: 1,
        globs: ["go.mod"],
      },
      {
        tier: 2, 
        globs: [
          "main.go",
          "cmd/**/main.go",
          "cmd/**/*.go",
        ],
      },
      {
        tier: 3, 
        globs: [
          "**/types.go", "**/models.go",
          "**/model/**/*.go",
        ],
      },
      {
        tier: 4, 
        globs: [
          "**/router.go", "**/routes.go",
          "**/handler*.go", "**/server.go",
        ],
      },
      {
        tier: 5, 
        globs: [
          "internal/**/*.go",
          "pkg/**/*.go",
          "**/config.go", "**/config/*.go",
        ],
      },
    ],
  },

  {
    id: "rust",
    name: "Rust",
    patterns: [
      {
        tier: 1,
        globs: ["Cargo.toml"],
      },
      {
        tier: 2, 
        globs: [
          "src/main.rs", "src/lib.rs",
        ],
      },
      {
        tier: 3, 
        globs: [
          "src/types.rs", "src/error.rs",
          "**/mod.rs",
        ],
      },
      {
        tier: 4, 
        globs: [
          "**/routes.rs", "**/handlers.rs", "**/api.rs",
        ],
      },
      {
        tier: 5, 
        globs: [
          "src/config.rs",
          "src/**/mod.rs",
        ],
      },
    ],
  },

  {
    id: "cpp",
    name: "C++",
    patterns: [
      {
        tier: 1, 
        globs: [
          "CMakeLists.txt", "Makefile", "meson.build",
          "conanfile.txt", "vcpkg.json",
          "*.cmake",
        ],
      },
      {
        tier: 2, 
        globs: [
          "main.cpp", "main.cc", "main.c",
          "src/main.cpp", "src/main.cc", "src/main.c",
        ],
      },
      {
        tier: 3, 
        globs: [
          "include/**/*.h", "include/**/*.hpp",
          "src/**/*.h", "src/**/*.hpp",
        ],
      },
      {
        tier: 5,
        globs: [
          "src/*.cpp", "src/*.cc",
        ],
      },
    ],
  },

  {
    id: "csharp",
    name: "C#",
    patterns: [
      {
        tier: 1, 
        globs: [
          "*.csproj", "*.sln",
          "Directory.Build.props", "global.json",
          "appsettings.json", "appsettings.*.json",
        ],
      },
      {
        tier: 2, 
        globs: [
          "Program.cs", "**/Program.cs",
          "Startup.cs", "**/Startup.cs",
        ],
      },
      {
        tier: 3, 
        globs: [
          "**/Models/**/*.cs",
          "**/Entities/**/*.cs",
        ],
      },
      {
        tier: 4, 
        globs: [
          "**/Controllers/**/*.cs",
          "**/Hubs/**/*.cs",
        ],
      },
      {
        tier: 5, 
        globs: [
          "**/Services/**/*.cs",
        ],
      },
    ],
  },

  {
    id: "php",
    name: "PHP",
    patterns: [
      {
        tier: 1, 
        globs: [
          "composer.json",
        ],
      },
      {
        tier: 2, 
        globs: [
          "index.php", "public/index.php",
          "artisan",
        ],
      },
      {
        tier: 3,
        globs: [
          "app/Models/**/*.php",
          "src/**/*.php",
        ],
      },
      {
        tier: 4, 
        globs: [
          "routes/web.php", "routes/api.php",
          "**/routes.php",
          "config/*.php",
        ],
      },
      {
        tier: 5, 
        globs: [
          "app/Services/**/*.php",
        ],
      },
    ],
  },

  {
    id: "scala",
    name: "Scala",
    patterns: [
      {
        tier: 1,
        globs: [
          "build.sbt",
          "project/build.properties",
          "project/plugins.sbt",
          "application.conf", "reference.conf",
        ],
      },
      {
        tier: 2,
        globs: [
          "**/Main.scala", "**/App.scala",
        ],
      },
      {
        tier: 3, 
        globs: [
          "**/models/**/*.scala",
          "**/core/**/*.scala",
        ],
      },
      {
        tier: 4, 
        globs: [
          "**/routes/**/*.scala",
          "**/controllers/**/*.scala",
        ],
      },
      {
        tier: 5, 
        globs: [
          "**/services/**/*.scala",
        ],
      },
    ],
  },

  {
    id: "lua",
    name: "Lua",
    patterns: [
      {
        tier: 1, 
        globs: [
          "conf.lua", "config.lua",
          "*.rockspec",
        ],
      },
      {
        tier: 2, 
        globs: [
          "main.lua", "init.lua", "app.lua",
        ],
      },
      {
        tier: 5, 
        globs: [
          "src/**/*.lua", "lib/**/*.lua",
          "**/init.lua",
        ],
      },
    ],
  },

  {
    id: "infra-as-code",
    name: "Infrastructure-as-Code",
    patterns: [
      {
        tier: 1, 
        globs: [
          "main.tf", "variables.tf", "outputs.tf", "providers.tf",
          "*.tf",
        ],
      },
      {
        tier: 1,
        globs: [
          "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
          "docker-compose.*.yml",
        ],
      },
      {
        tier: 1, 
        globs: [
          "Chart.yaml",
          "**/values.yaml",
          "**/deployment.yaml",
          "**/service.yaml",
          "**/configmap.yaml",
        ],
      },
      {
        tier: 1, 
        globs: [
          "template.yaml", "template.json",
          "**/template.yaml",
        ],
      },
      {
        tier: 1, 
        globs: [
          "Pulumi.yaml", "Pulumi.*.yaml",
        ],
      },
      {
        tier: 1, 
        globs: [
          "playbook.yml", "site.yml", "ansible.cfg",
          "**/main.yml",
        ],
      },
      {
        tier: 1, 
        globs: [
          ".github/workflows/*.yml", ".github/workflows/*.yaml",
          ".gitlab-ci.yml",
          "Jenkinsfile",
          ".circleci/config.yml",
        ],
      },
    ],
  },
];




