import { ElasticsearchService } from '@nestjs/elasticsearch';
import { AppConfig } from '../../app.config';
import { SearchRepositoryElasticsearch } from './search-repository.elasticsearch';
describe('Search Repository Elasticsearch', () => {
  let repository: SearchRepositoryElasticsearch;
  let client: ElasticsearchService;
  beforeEach(async () => {
    client = new ElasticsearchService({
      node: "http:/placeholder:9200"
    });
    jest.spyOn(client, "search").mockRejectedValue(new Error("Mock No Implemented") as never);
    repository = new SearchRepositoryElasticsearch(
      client,
      new AppConfig('content', 'channel')
    );
  });
  describe('getTypeAhead', () => {
    it('should get suggestions from title.suggest', async () => {
      const expected = ['result1', 'result2'];
      const searchMock = {
        body: {
          suggest: {
            'title.suggest': [
              {
                options: expected.map(text => ({ text }))
              }
            ]
          }
        }
      };
      jest.spyOn(client, "search").mockResolvedValue(searchMock as never)
      const result = await repository.getTypeAhead('harry', 'title');
      expect(result).toEqual(expected);
    });
    it('should return empty array if no suggestions available', async () => {
      const expected = [];
      const searchMock = {
        body: {
          suggest: {}
        }
      };
      jest.spyOn(client, "search").mockResolvedValue(searchMock as never)
      const result = await repository.getTypeAhead('harry', 'title');
      expect(result).toEqual(expected);
    });
  });
  describe('pageQuery', () => {
    it('should create query with success', () => {
      expect(repository.pageQuery(1, 1)).toEqual({ from: 0, size: 1 })
      expect(repository.pageQuery(1, 10)).toEqual({ from: 0, size: 10 })
      expect(repository.pageQuery(2, 10)).toEqual({ from: 10, size: 10 })
      expect(repository.pageQuery(3, 10)).toEqual({ from: 20, size: 10 })
    })
    it('should be empty on invalid input', () => {
      expect(repository.pageQuery(null, 1)).toEqual({})
      expect(repository.pageQuery(1, null)).toEqual({})
      expect(repository.pageQuery(undefined, 1)).toEqual({})
      expect(repository.pageQuery(1, undefined)).toEqual({})
      expect(repository.pageQuery(undefined, undefined)).toEqual({})
      expect(repository.pageQuery(null, null)).toEqual({})
    })
  })
  describe('getContents', () => {
    it('should parse results', async () => {
      expect.assertions(1);
      const searchMock = {
        body: {
          hits: {
            total: { value: 5 },
            hits: [
              {
                _id: 'r1',
                _source: { a: '1' }
              },
              {
                _id: 'r2',
                _source: { a: '1' }
              },
              {
                _id: 'r3',
                _source: { a: '1' }
              },
              {
                _id: 'r4',
                _source: { a: '1' }
              },
              {
                _id: 'r5',
                _source: { a: '1' }
              },
            ]
          }
        }
      };
      jest.spyOn(client, "search").mockResolvedValue(searchMock as never)
      const result = await repository.getContents('harry')
      expect(result).toEqual({
        results: [
          {
            id: 'r1',
            a: '1'
          },
          {
            id: 'r2',
            a: '1'
          },
          {
            id: 'r3',
            a: '1'
          },
          {
            id: 'r4',
            a: '1'
          },
          {
            id: 'r5',
            a: '1'
          },
        ],
        page: 1,
        limit: null,
        totalDocs: 5
      });
    })
    it('should use page query', async () => {
      expect.assertions(2);
      const searchMock = {
        body: {
          hits: {
            total: { value: 10 },
            hits: [
              {
                _id: 'r1',
                _source: { a: '1' }
              },
              {
                _id: 'r2',
                _source: { a: '1' }
              },
              {
                _id: 'r3',
                _source: { a: '1' }
              },
              {
                _id: 'r4',
                _source: { a: '1' }
              },
              {
                _id: 'r5',
                _source: { a: '1' }
              },
            ]
          }
        }
      };
      const pageQuerySpy = jest.spyOn(repository, "pageQuery")
      jest.spyOn(client, "search").mockResolvedValue(searchMock as never)
      const result = await repository.getContents('harry', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 2, 5)
      expect(pageQuerySpy).toHaveBeenCalledWith(2, 5);
      expect(result).toEqual({
        results: [
          {
            id: 'r1',
            a: '1'
          },
          {
            id: 'r2',
            a: '1'
          },
          {
            id: 'r3',
            a: '1'
          },
          {
            id: 'r4',
            a: '1'
          },
          {
            id: 'r5',
            a: '1'
          },
        ],
        page: 2,
        limit: 5,
        totalDocs: 10
      });
    })
    it('should test the category filters array', async () => {
      expect.assertions(1);
      const searchMock = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'r1',
                _source: { a: '1' }
              }
            ]
          }
        }
      };
      jest.spyOn(client, "search").mockResolvedValue(searchMock as never)
      const result = await repository.getContents(undefined,'drama')
      expect(result).toEqual({
        results: [
          {
            id: 'r1',
            a: '1'
          }
        ],
        page: 1,
        limit: null,
        totalDocs: 1
      });
    })
    it('should test the country filters array', async () => {
      expect.assertions(1);
      const searchMock = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'r1',
                _source: { a: '1' }
              }
            ]
          }
        }
      };
      jest.spyOn(client, "search").mockResolvedValue(searchMock as never)
      const result = await repository.getContents(undefined, undefined, 'Chile')
      expect(result).toEqual({
        results: [
          {
            id: 'r1',
            a: '1'
          }
        ],
        page: 1,
        limit: null,
        totalDocs: 1
      });
    })
    it('should test the startDate and endDate filters array', async () => {
      expect.assertions(1);
      const searchMock = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'r1',
                _source: { a: '1' }
              }
            ]
          }
        }
      };
      jest.spyOn(client, "search").mockResolvedValue(searchMock as never)
      const result = await repository.getContents(undefined, undefined, undefined, new Date(), new Date())
      expect(result).toEqual({
        results: [
          {
            id: 'r1',
            a: '1'
          }
        ],
        page: 1,
        limit: null,
        totalDocs: 1
      });
    })
    it('should test the startDate filters array', async () => {
      expect.assertions(1);
      const searchMock = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'r1',
                _source: { a: '1' }
              }
            ]
          }
        }
      };
      jest.spyOn(client, "search").mockResolvedValue(searchMock as never)
      const result = await repository.getContents(undefined, undefined, undefined, new Date())
      expect(result).toEqual({
        results: [
          {
            id: 'r1',
            a: '1'
          }
        ],
        page: 1,
        limit: null,
        totalDocs: 1
      });
    })
    it('should test the endDate filters array', async () => {
      expect.assertions(1);
      const searchMock = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'r1',
                _source: { a: '1' }
              }
            ]
          }
        }
      };
      jest.spyOn(client, "search").mockResolvedValue(searchMock as never)
      const result = await repository.getContents(undefined, undefined, undefined, undefined, new Date())
      expect(result).toEqual({
        results: [
          {
            id: 'r1',
            a: '1'
          }
        ],
        page: 1,
        limit: null,
        totalDocs: 1
      });
    })
    it('should test the contentID filters array', async () => {
      expect.assertions(1);
      const searchMock = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'r1',
                _source: { a: '1' }
              }
            ]
          }
        }
      };
      jest.spyOn(client, "search").mockResolvedValue(searchMock as never)
      const result = await repository.getContents(undefined, undefined, undefined, undefined, undefined, 'agftcvh')
      expect(result).toEqual({
        results: [
          {
            id: 'r1',
            a: '1'
          }
        ],
        page: 1,
        limit: null,
        totalDocs: 1
      });
    })
    it('should test the contentType filters array', async () => {
      expect.assertions(1);
      const searchMock = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'r1',
                _source: { a: '1' }
              }
            ]
          }
        }
      };
      jest.spyOn(client, "search").mockResolvedValue(searchMock as never)
      const result = await repository.getContents(undefined, undefined, undefined, undefined, undefined, undefined, ['SERIES'])
      expect(result).toEqual({
        results: [
          {
            id: 'r1',
            a: '1'
          }
        ],
        page: 1,
        limit: null,
        totalDocs: 1
      });
    })
    it('should test the page and limit params', async () => {
      expect.assertions(2);
      const searchMock = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'r1',
                _source: { a: '1' }
              }
            ]
          }
        }
      };
      jest.spyOn(client, "search").mockResolvedValue(searchMock as never)
      const pageQuery = await repository.getContents('movie', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 2)

      expect(pageQuery).toEqual({
        results: [
          {
            id: 'r1',
            a: '1'
          }
        ],
        page: 2,
        limit: 20,
        totalDocs: 1
      });
      const limitQuery = await repository.getContents('movie', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 19)

      expect(limitQuery).toEqual({
        results: [
          {
            id: 'r1',
            a: '1'
          }
        ],
        page: 1,
        limit: 19,
        totalDocs: 1
      });

    })
    it('should test the return query parsed', async () => {
      expect.assertions(1);
      const pageQuery = repository.getParsedQuery(['movie'], [])
      expect(pageQuery).toEqual({
				bool: {
					must: ['movie'],
					filter: [],
				},
			})

    })
    it('should test the returned hits', async () => {
      expect.assertions(1);
      const result = {
        body: {
          hits: {
            total: { value: 10 },
            hits:
              {
                _id: 'r1',
                _source: { a: '1' }
              },
          }
        }
      }
      
      const pageQuery = repository.getHitsResponse(result)
      expect(pageQuery).toMatchObject({
				hitDocs: { _id: 'r1', _source: { a: '1' } }, totalDocs: 10
			})

    })
  })
});