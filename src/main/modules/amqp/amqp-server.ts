import { connect, Channel, Connection, Message, ConsumeMessage } from 'amqplib';
import { DependencyContainer, InjectionToken } from 'tsyringe';
import { AMQP } from '@/main/modules/amqp/amqp';
import { Module } from '@/main/modules/modules';
import { RabbitMQConfig } from '@/main/modules/amqp/amqp.config';
import { Consumer } from '@/presentation/amqp/consumers/consumer';
import { FindUserByIdConsumer } from '@/presentation/amqp/consumers/findUserById/find-user-by-id';
import { logger } from '@/logger';
import { validation } from '@/presentation/amqp/middlewares/validation';
import { convertToJson } from '@/shared/helper/buffer-converter';

export class AMQPServer extends AMQP implements Module {
  protected channel: Channel;
  protected connection: Connection;

  constructor(
    protected readonly container: DependencyContainer,
    protected readonly config: RabbitMQConfig
  ) {
    super();
  }

  loadConsumers(): Function[] {
    return [FindUserByIdConsumer];
  }

  async start(): Promise<void> {
    try {
      this.connection = await connect(this.config);
      this.channel = await this.connection.createChannel();

      logger.info(`RabbitMQ: AMQP server started`);

      this.container.register('vHost', { useValue: this.channel });
      logger.info(
        `RabbitMQ connection established on vhost - ${this.config.vhost}`
      );

      this.startConsumers();
    } catch (err) {
      logger.error(
        `Error connecting RabbitMQ to virtual host ${this.config.vhost} : ${err.message}`
      );
      this.reconnect();
    }
  }

  protected startConsumers(): void {
    this.loadConsumers().forEach((consumer: Function) => {
      const instance = this.container.resolve<Consumer>(
        consumer as InjectionToken
      );

      this.channel.consume(
        instance.queue,
        async (message: ConsumeMessage | null) => {
          try {
            if (message) {
              const messageContent = validation(instance.schema)(
                convertToJson(message.content)
              );

              await instance.messageHandler(messageContent);
            }
          } catch (error) {
            instance.onConsumeError(error, this.channel, message);
          } finally {
            if (message) this.channel.ack(message);
          }
        }
      );

      logger.info(`RabbitMQ: 'Started queue '${instance.queue}' to consume`);
    });
  }
}
