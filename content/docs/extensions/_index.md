---
title: "Extensions"
description: "Extend Solobase capabilities with official and community extensions"
weight: 60
---

# Extensions

Solobase provides a powerful extension system that allows you to add new features and capabilities to your backend. Extensions can be official (maintained by the Solobase team) or community-driven, giving you the flexibility to build exactly what you need.

## Available Extensions

### Official Extensions

- **[Formula Based Pricing]({{< ref "formula-pricing" >}})** - Create dynamic pricing models with unlimited flexibility
- **[Dynamic Products]({{< ref "dynamic-products" >}})** - Define custom product schemas with flexible fields
- **[Cloud Storage]({{< ref "cloud-storage" >}})** - Advanced storage capabilities with usage tracking and limits

### Community Extensions

Browse community extensions on our [GitHub repository](https://github.com/suppers-ai/solobase-extensions).

## Installing Extensions

Extensions can be installed using the Solobase CLI:

```bash
# Install an official extension
solobase extension install formula-pricing

# Install from GitHub
solobase extension install github:username/extension-name
```

## Creating Your Own Extensions

Extensions in Solobase are built using Go and follow a simple plugin architecture. Here's a basic example:

```go
package main

import (
    "github.com/suppers-ai/solobase/pkg/extension"
)

type MyExtension struct {
    extension.Base
}

func (e *MyExtension) Initialize() error {
    // Extension initialization logic
    return nil
}

func (e *MyExtension) Routes() []extension.Route {
    return []extension.Route{
        {
            Method:  "GET",
            Path:    "/api/my-extension",
            Handler: e.handleRequest,
        },
    }
}

func main() {
    extension.Register(&MyExtension{})
}
```

## Extension API

All extensions have access to:

- Database connections
- Authentication middleware
- Storage services
- Event system
- Configuration management

## Best Practices

1. **Namespace your routes** - Use a unique prefix for your extension's API endpoints
2. **Document your extension** - Provide clear documentation and examples
3. **Test thoroughly** - Include unit and integration tests
4. **Version your extension** - Use semantic versioning for releases
5. **Handle errors gracefully** - Provide meaningful error messages

## Contributing Extensions

To contribute an extension to the community:

1. Fork the [solobase-extensions](https://github.com/suppers-ai/solobase-extensions) repository
2. Add your extension following the template
3. Submit a pull request with documentation
4. Tag your extension with appropriate categories

## Support

For help with extensions:

- Check the [extension documentation](https://docs.solobase.ai/extensions)
- Join our [Discord community](https://discord.gg/solobase)
- Open an issue on [GitHub](https://github.com/suppers-ai/solobase/issues)