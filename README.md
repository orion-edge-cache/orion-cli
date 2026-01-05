# @orion/cli

Command-line interface for Orion GraphQL Edge Cache.

## Installation

```bash
npm install -g @orion/cli
```

## Usage

```bash
orion
```

This will launch an interactive CLI that guides you through:
- Deploying infrastructure (AWS + Fastly)
- Building and deploying Fastly Compute apps
- Managing configurations
- Viewing deployment details
- Destroying infrastructure
- Running cache tests

## Development

```bash
# Install dependencies
npm install

# Run CLI in development
npm start

# Build for production
npm run build

# Bundle standalone executable
npm run cli:bundle
```

## Dependencies

This CLI depends on `@orion/infra` for all infrastructure operations.

## License

ISC
