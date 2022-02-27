# @apiture/api-ref-resolver

`api-ref-resolver` resolves multi-file API definition documents by replacing
external `{$ref: "uri"}` [JSON Reference](https://datatracker.ietf.org/doc/html/draft-pbryan-zyp-json-ref-03)
objects with the object referenced at the `uri`.
The `uri`
may be a file-path or a URL with an optional `#` [JSON Pointer fragment](https://datatracker.ietf.org/doc/html/draft-ietf-appsawg-json-pointer-04).

The tool handles chains of JSON references (i.e. a.yaml references components from b.yaml which references components from c.yaml) as
well as direct or indirect cycles (component A references component B which references component A).

Unlike other generic `$ref` resolvers ([1](https://github.com/Mermade/oas-kit/tree/main/packages/oas-resolver), [2](https://www.npmjs.com/package/@stoplight/json-ref-resolver), [3](https://github.com/APIDevTools/json-schema-ref-parser)),
`api-ref-resolver` treats component references specially. It understands reusable `components/section/componentName` objects at the top-level of an API definition, such as `components/schemas/schemaName`, and attempts to
maintain those component structures; see [Notes](#notes) below.
Otherwise, it is specification agnostic and works with either
[OpenAPI](https://www.openapis.org/) specification or [AsyncAPI](https://www.asyncapi.com/) specification.

This tool does not enforce JSON Reference strictness; that is, the `$ref` member may have siblings.

## To Do

This tool does not yet merge non-`$ref` content from API files. For example, if
one file has a `$ref` to an operation in another file, this tool
does not pull in API elements from the referenced file, such as the
`tags` and `security` requirements of the referenced operation.

## Use

### Command Line Interface

```bash
api-ref-resolver --input api.yaml --output resolved-api.yaml
# arr is an alias command
arr --input api.yaml --output resolved-api.yaml
```

Command line options:

```text
Usage: api-ref-resolver [options]

Options:
  -V, --version               output the version number
  -i, --input <input-file>    An openapi.yaml or asyncapi.yaml file name or URL. Defaults to "api.yaml"
  -o, --output <output-file>  The output file, defaults to stdout if omitted
  -f, --format [yaml|json]    Output format for stdout if no --output option is used; default to yaml
  -v, --verbose               Verbose output
  -h, --help                  display help for command
```

### Node.js

```javascript
import { ApiRefResolver } from '@apiture/api-ref-resolver';
import * as fs from 'fs';
import * as path from 'path';

const sourceFileName = 'apy.yaml'
const outputFileName = 'resolved-api.yaml'

const resolver = new ApiRefResolver(sourceFileName);
const options: ApiRefOptions = {
  verbose: false,
  conflictStrategy: 'error', # 'error' | 'rename' | 'ignore';
  outputFormat: 'yaml'       # 'yaml' | 'json'
};
options.verbose = opts.verbose;
resolver
  .resolve(options)
  .then((resolved) => {
    if (outputFileName) {
      const outDir = path.dirname(outputFileName);
      mkdirs(outDir);
      fs.writeFileSync(outputFileName, yaml.dump(resolved.api), 'utf8');
    }
  })
  .catch((ex) => {
    console.error(ex.message);
    process.exit(1);
  });

## Notes



Below, a `normalized-path` is defined as the simplified
version of a file-path or URL, i.e. with `../` path elements collapsed.
The normalized path for `../a/b/c/../../d/e`  is `../a/d/e`.

There are four types of replacements:

1. local references, `{ $ref: "#/path/to/element" }`
This tool does not alter these.
2. _Component replacements_ are of the form
`{ $ref: "uri#/components/section/componentName" }` (`section` may be `schemas`,
`parameters`, `response`, or other `components`). This replacement only done for three levels; for longer JSON pointers, see #4 below.
For component replacements,
the external URI is read (if not already cached) and the named components
inserted into the target document
in side it's own components object, and the `$ref` replaced by
`{ $ref: "#/components/section/componentName" }`. 
The `ApiRefOptions.conflictPolicy` determines what to do if the component
already exists; it is either renamed with a unique numeric suffix (`rename`)
or it is an error and the entire process fails (`error`).
Note: The OpenAPI Specification requires that these paths be relative to the
path in the
`servers` object, but this tool simply uses relative references
from the source URI.)
3. _Full resource replacements_ are of the form
`{ $ref: "uri" }` with no `#` fragment. If not yet seen, the entire external file
is inserted, replacing the `$ref` object. The location is
remembered so that any duplicate references to the normalized
path are replaced with a local `{ $ref: #/location/to/resource }'
4. _Other embedded objects_
When referencing non-component objects, such as 
`{ $ref: "file-path#paths/~api~path/get" } to include the `get` operation at 
the OpenAPI path /api/path the external
object

After embedding an external object from `uri`, the tool will also resolve any
`$ref` objects in it, relative to the path that the object was read from.
Any `{ $ref: "#/..."}` objects are converted to `{ $ref: "normalized-path#/..."}`
