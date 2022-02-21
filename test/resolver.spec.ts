/* eslint-disable prefer-destructuring */
import * as fs from 'fs';
import * as path from 'path';

import {
    describe, 
    expect, 
    test, 
    xit,
} from '@jest/globals';
import * as yaml from 'js-yaml';

import { ApiRefResolver } from '../src/ApiRefResolver';

describe('resolver test suite', () => {
  test('resolve single file results in same object', (done) => {
    const sourceFileName = path.join(__dirname, 'test-data/root.yaml');// __dirname is the test dir
    console.log(sourceFileName);
    const original = yaml.load(fs.readFileSync(sourceFileName, 'utf8'), { filename: sourceFileName, schema: yaml.JSON_SCHEMA});
    const resolver = new ApiRefResolver(sourceFileName);
    resolver
      .resolve()
      .then((result) => {
        expect(result).toBeDefined();
        expect(result.api).toEqual(original);
        done();
      })
      .catch((ex) => {
        done(ex);
      });
  });
  test('resolve scans multi-file OpenAPI document', (done) => {
    const sourceFileName = path.join(__dirname, 'test-data/api-b/api.yaml'); // __dirname is the test dir
    console.log(sourceFileName);
    const original = yaml.load(fs.readFileSync(sourceFileName, 'utf8'), { filename: sourceFileName, schema: yaml.JSON_SCHEMA});
    expect(original).toBeDefined();
    const options = {verbose: true};
    const resolver = new ApiRefResolver(sourceFileName);
    resolver
      .resolve(options)
      .then((result) => {
        expect(result).toBeDefined();
        const resolved = result.api;
        expect(resolved).toBeDefined();
        done();
      })
      .catch((ex) => {
        done(ex);
      });
  });

  xit('resolve components from multi-file OpenAPI document', (done) => {
    const sourceFileName = 'test-data/api-b/api.yaml';
    const resolver = new ApiRefResolver(sourceFileName);
    resolver
      .resolve()
      .then((result) => {
        const resolved = result.api;
        const components = resolved.components as any;
        const schemas = Object.keys(components.schemas);
        schemas.forEach((schemaName) => {
          const schema = components.schemas[schemaName];
          expect(schema).toBeDefined();
          expect(schema.$ref).toBeFalsy();
          expect(schema.title).toBeTruthy();
          expect(schema.type).toBeTruthy();
          expect(schema.description).toBeTruthy();
        });
        const responses = Object.keys(components.responses);
        responses.forEach((responseCode) => {
          const response = components.responses[responseCode];
          expect(response).toBeDefined();
          expect(response.$ref).toBeFalsy();
        });
        const parameters = Object.keys(components.parameters);
        parameters.forEach((parameterName) => {
          const parameter = components.parameters[parameterName];
          expect(parameter).toBeDefined();
          expect(parameter.$ref).toBeFalsy();
        });
        const post = resolved.paths['/thing'].post;
        expect(post).toBeDefined();
        const requestBodySchema = post.requestBody.content['application/json'].schema;
        expect(requestBodySchema).toBeDefined();
        expect(requestBodySchema.$ref).toBeDefined();
        expect(Object.keys(requestBodySchema)).toEqual(['$ref']);
        const response400 = post.responses[400];
        expect(response400.$ref).toBeDefined();
        expect(Object.keys(response400)).toEqual(['$ref']);
        done();
      })
      .catch((ex) => {
        done(ex);
      });
  });
});
