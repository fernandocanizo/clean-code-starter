import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { plainToClass } from 'class-transformer';
import { AppConfig } from '../../app.config';
import { Content } from '../../entities/content';
import { PaginatedCollection } from '../../entities/paginated-collection';
import { SearchClientAppsRepositoryInterface } from '../search-repository.interface';

@Injectable()
export class SearchClientAppsRepositoryElasticsearch
	implements SearchClientAppsRepositoryInterface
{
	constructor(
		private readonly client: ElasticsearchService,
		private readonly config: AppConfig,
	) {}

	async getContentClientApps(
		term: string,
		page?: number,
		limit?: number,
	): Promise<PaginatedCollection<Content>> {
		const { contentIndexName } = this.config;
		let query: any = { match_all: {} };

		query = {
			bool: {
				should: {
					multi_match: {
						fields: [
                            "title^4",
                            "title.*^4.5",
							"description^2",
							"description.*^2.5",
                            "contributors.name^2",
                            "contributors.name.*^2.5",
                            "categories^1",
							"categories.*^1",
                            "keywords^1",
							"keywords.*^1"
						],
						query: term,
						type: 'best_fields',
					},
				},
			},
		};

		const body = {
			query: query,
			sort: [
				{
					_score: {
						order: 'desc',
					},
				},
			],
			...this.pageQuery(page, limit),
		};

		const result = await this.client.search({
			index: contentIndexName,
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

	private pageQuery(
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
}
