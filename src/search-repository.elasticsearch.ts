import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { AppConfig } from '../../app.config';
import { SearchRepositoryInterface } from '../search-repository.interface';
import { plainToClass } from 'class-transformer';
import { PaginatedCollection } from '../../entities/paginated-collection';
import { Content } from '../../entities/content';

const DEFAULT_SUGGESTION_LIMIT = 10;

@Injectable()
export class SearchRepositoryElasticsearch
	implements SearchRepositoryInterface
{
	constructor(
		private readonly client: ElasticsearchService,
		private readonly config: AppConfig,
	) {}
	async getTypeAhead(text: string, propertyName: string): Promise<string[]> {
		const { contentIndexName } = this.config;

		const suggestionField = `${propertyName}.suggest`;

		const suggest = {
			[suggestionField]: this.buildCompletionQuery(text, suggestionField),
		};

		const result = await this.client.search({
			index: contentIndexName,
			_source: 'false',
			body: { suggest },
		});

		let suggestions = [];

		const suggestionResult = result.body.suggest[suggestionField];

		if (suggestionResult && suggestionResult.length > 0) {
			suggestions = suggestionResult[0].options.map(
				(option) => option.text,
			);
		}

		return suggestions;
	}

	async getContents(
		term?: string,
		category?: string,
		country?: string,
		startDate?: Date,
		endDate?: Date,
		contentId?: string,
		contentType?: Array<string>,
		ratings?: Array<string>,
		sortBy?: any,
		page?: number,
		limit?: number,
	): Promise<PaginatedCollection<Content>> {
		const { contentIndexName } = this.config;

		let query: any = { match_all: {} };
		const must: any[] = [];
		const filter: any[] = [];

		if (term) {
			must.push({
				multi_match: {
					fields: [
						'title',
						'title.*^1.5',
						'description',
						'description.*^1.5',
						'contributors.name',
						'contributors.name.*^1.5',
					],
					query: term,
					type: 'best_fields',
				},
			});
		}

		if (category) {
			filter.push({
				multi_match: {
					fields: ['categories', 'categories.*^1.5'],
					query: category,
					type: 'best_fields',
				},
			});
		}

		if (country) {
			filter.push({
				bool: {
					should: [
						{
							bool: {
								must: {
									match: { 'usagePolicy.default': 'ALLOW' },
								},
								must_not: {
									match: {
										'usagePolicy.exceptionCountryCodes':
											country,
									},
								},
							},
						},
						{
							bool: {
								must: [
									{
										match: {
											'usagePolicy.default': 'BLOCK',
										},
									},
									{
										match: {
											'usagePolicy.exceptionCountryCodes':
												country,
										},
									},
								],
							},
						},
					],
				},
			});
		}

		if (startDate && endDate) {
			filter.push({
				bool: {
					should: [
						{
							range: {
								dateCreated: {
									gte: startDate,
									lte: endDate,
								},
							},
						},
						{
							range: {
								dateModified: {
									gte: startDate,
									lte: endDate,
								},
							},
						},
						{
							range: {
								dateReleased: {
									gte: startDate,
									lte: endDate,
								},
							},
						},
					],
				},
			});
		} else if (startDate) {
			filter.push({
				bool: {
					should: [
						{
							range: {
								dateCreated: {
									gte: startDate,
								},
							},
						},
						{
							range: {
								dateModified: {
									gte: startDate,
								},
							},
						},
						{
							range: {
								dateReleased: {
									gte: startDate,
								},
							},
						},
					],
				},
			});
		} else if (endDate) {
			filter.push({
				bool: {
					should: [
						{
							range: {
								dateCreated: {
									lte: endDate,
								},
							},
						},
						{
							range: {
								dateModified: {
									lte: endDate,
								},
							},
						},
						{
							range: {
								dateReleased: {
									lte: endDate,
								},
							},
						},
					],
				},
			});
		}

		if (contentId) {
			filter.push({
				match: {
					id: contentId,
				},
			});
		}

		if (contentType) {
			const contentTypeArray = contentType.map((itemContentType) => ({
				match: { contentType: itemContentType.toUpperCase() },
			}));
			must.push({
				bool: {
					should: contentTypeArray,
				},
			});
		}

		if (page || limit) {
			page = parseInt(page as any, 10) || 1;
			limit = parseInt(limit as any, 10) || 20;
    }

		if (ratings) {
			const ratingArray = ratings.map((ratingItem) => ({
				match: { ['ratings.ratingValue']: ratingItem },
			}));
			must.push({
				bool: {
					should: ratingArray,
				},
			});
    }

		const defaultSort = {
			_score: {
				order: 'desc',
			},
			dateCreated: 'desc',
		};
		let sortingCriteriaFields: any = [defaultSort];
		const noKeywordsParamsArray = [
			'contributors',
			'categories',
			'contentType',
			'ratings',
		];
		const directSearchParamsArray = ['language', 'id', 'vodType'];

		if (sortBy) {
			const noKeywordsParam = Object.fromEntries(
				Object.entries(sortBy).filter((e) =>
					noKeywordsParamsArray.includes((e as unknown as string)[0]),
				),
			);
			const directSearch = Object.fromEntries(
				Object.entries(sortBy).filter((e) =>
					directSearchParamsArray.includes(
						(e as unknown as string)[0],
					),
				),
			);

			const paramsWithKeywords = Object.fromEntries(
				Object.entries(sortBy).filter(
					(e) =>
						!noKeywordsParamsArray.includes(
							(e as unknown as string)[0],
						) &&
						!directSearchParamsArray.includes(
							(e as unknown as string)[0],
						),
				).map(([key, value]) => [
					`${key}.keyword`,
					value,
				]),
			);

			sortingCriteriaFields = [
				{
					...paramsWithKeywords,
					...noKeywordsParam,
					...directSearch,
				},
				defaultSort,
			];
		}

		if (must.length || filter.length) {
			query = {
				bool: {
					must: must,
					filter: filter,
				},
			};
		}
      
		query = this.getParsedQuery(must, filter)
		const body = {
			query: query,
			sort: sortingCriteriaFields,
			...this.pageQuery(page, limit),
		};

		const result = await this.client.search({
			index: contentIndexName,
			body,
		});

		const { hitDocs, totalDocs } = this.getHitsResponse(result)

		return {
			results: hitDocs.map((hit: any) =>
				this.parseContent(hit._id, hit._source),
			),
			page: page || 1,
			limit: limit || null,
			totalDocs,
		};
	}

	async getChannelContents(
		term?: string,
		sortBy?: any,
		startDate?: Date,
		endDate?: Date,
		page?: number,
		limit?: number,
	): Promise<PaginatedCollection<Content>> {
		const { channelIndexName } = this.config;
		let query: any = { match_all: {} };
		const must: any[] = [];
		const filter: any[] = [];

		if (term) {
			must.push({
				multi_match: {
					fields: [
						'channelTitle',
						'transmissionTitle',
						'channelTitle.*^1.5',
						'transmissionTitle.*^1.5',
					],
					query: term,
					type: 'best_fields',
				},
			});
		}
		this.filterDateRanges(startDate, endDate, filter);

		if (must.length || filter.length) {
			query = {
				bool: {
					must: must,
					filter: filter,
				},
			};
		}
		const defaultSort = {
			_score: {
				order: 'desc',
			},
		};
		let sortingCriteriaFields: any = [defaultSort];

		if (sortBy) {
			const serializedSort = this.keywordHelper(sortBy, 'channelTitle')
			sortingCriteriaFields = [serializedSort, defaultSort];
		}

		const body = {
			query: query,
			sort: sortingCriteriaFields,
			...this.pageQuery(page, limit),
		};

		const result = await this.client.search({
			index: channelIndexName,
			body,
		});

		const hitDocs = result.body?.hits?.hits || [];
		const totalDocs = result.body?.hits?.total?.value || 0;

		return {
			results: hitDocs.map((hit: any) =>
				this.parseContent(hit._id, hit._source),
			),
			page: page || 1,
			limit: limit || null,
			totalDocs,
		};
	}

	pageQuery(
		page?: number | null,
		limit?: number | null,
	): { from?: number; size?: number } {
		if (page && limit) {
			return {
				from: (page - 1) * limit,
				size: limit,
			};
		}

		return {};
	}

	private parseContent(id: string, source: any): Content {
		const doc = {
			id,
			...source,
		};

		return plainToClass(Content, doc);
	}

	private buildCompletionQuery(text: string, field: string): any {
		return {
			prefix: text,
			completion: {
				field: field,
				size: DEFAULT_SUGGESTION_LIMIT,
				skip_duplicates: true,
			},
		};
	}

	keywordHelper(sortBy, attribute) {
		const obj = {}
		Object.entries(sortBy).map(function(key) {
			if(key[0] === attribute){
				delete Object.assign(obj, sortBy, {[`${attribute}.keyword`]: sortBy[attribute] })[attribute];
			}
		})
		return obj;
		}

	getParsedQuery(must, filter) {
		return {
			bool: {
				must: must.length > 0 ? must : [],
				filter: filter.length > 0 ? filter : [],
			},
		};
	}
	/* istanbul ignore next */
	getHitsResponse(result) {
		return {
			hitDocs: result.body?.hits?.hits || [],
			totalDocs: result.body?.hits?.total?.value || 0
		}
	}

	private filterDateRanges(startDate, endDate, filter) {
		if (startDate && endDate) {
			filter.push({
				bool: {
					should: [
						{
							range: {
								startDate: {
									gte: startDate,
									lte: endDate,
								},
							},
						},
						{
							range: {
								endDate: {
									gte: startDate,
									lte: endDate,
								},
							},
						},
					],
				},
			});
		} else if (startDate) {
			filter.push({
				bool: {
					should: [
						{
							range: {
								startDate: {
									gte: startDate,
								},
							},
						},
					],
				},
			});
		} else if (endDate) {
			filter.push({
				bool: {
					should: [
						{
							range: {
								endDate: {
									lte: endDate,
								},
							},
						},
					],
				},
			});
		}
	}
}
