/* eslint-disable no-template-curly-in-string */
module.exports = function (plop) {
  plop.setGenerator('module', {
    description: 'Gera scaffolding para module: controller/service/repository/dto',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Nome do módulo (ex.: concursos):',
      },
      {
        type: 'confirm',
        name: 'withApiRoute',
        message: 'Criar rota API /api/<name>?',
        default: true,
      },
    ],
    actions: (data) => {
      const name = plop.getHelper('dashCase')(data.name);
      const className = plop.getHelper('properCase')(data.name);
      const actions = [];

      // DTO
      actions.push({
        type: 'add',
        path: 'src/modules/{{dashCase name}}/dtos/{{dashCase name}}.dto.ts',
        templateFile: 'templates/dto.hbs',
      });

      // Repository
      actions.push({
        type: 'add',
        path: 'src/modules/{{dashCase name}}/{{dashCase name}}.repository.ts',
        templateFile: 'templates/repository.hbs',
      });

      // Service
      actions.push({
        type: 'add',
        path: 'src/modules/{{dashCase name}}/{{dashCase name}}.service.ts',
        templateFile: 'templates/service.hbs',
      });

      // Controller (opcional por padrão usamos API routes, mas mantemos pattern)
      actions.push({
        type: 'add',
        path: 'src/modules/{{dashCase name}}/controllers/{{dashCase name}}.controller.ts',
        templateFile: 'templates/controller.hbs',
      });

      if (data.withApiRoute) {
        actions.push({
          type: 'add',
          path: 'src/api/{{dashCase name}}/route.ts',
          templateFile: 'templates/api-route.hbs',
        });
      }

      return actions;
    },
  });
};



