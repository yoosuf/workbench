# Contributing Guidelines

We welcome contributions to the Universal Database Workbench! This document outlines the process and standards for contributing to the project.

## Code of Conduct

Please be respectful and constructive in all interactions. We're building a positive community where everyone feels welcome.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** from `main`
4. **Follow the setup instructions** in [SETUP.md](./SETUP.md)
5. **Make your changes** following our guidelines
6. **Submit a pull request**

## Development Setup

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed setup instructions.

Quick start:
```bash
git clone https://github.com/yourusername/workbench.git
cd workbench
pnpm install
docker-compose up -d
pnpm db:migrate
pnpm dev
```

## Making Changes

### Branch Naming

Use descriptive branch names:
```bash
git checkout -b feature/add-export-functionality
git checkout -b fix/handle-null-values
git checkout -b docs/update-readme
```

### Code Style

We maintain consistent code style across the project:

#### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint rules (run `pnpm lint`)
- Use Prettier for formatting (run `pnpm format`)
- Prefer const/let over var
- Use arrow functions where appropriate

#### File Organization
- Keep files small and focused (max ~300 lines)
- Group related imports
- Export named exports (prefer over default)
- Use consistent file naming (kebab-case for files, PascalCase for components)

#### Naming Conventions
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useConnectionStore.ts`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)
- **Functions**: camelCase (`fetchConnections()`)
- **Classes**: PascalCase (`ConnectionManager`)

### React/Frontend Standards

- Use functional components exclusively
- Use React hooks for state management
- Component files should be self-contained
- Keep components focused on a single responsibility
- Use TypeScript interfaces for props

Example component:
```typescript
interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onUpdate }) => {
  const { data, loading } = useQuery(GET_USER, { variables: { userId } });

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

### NestJS/Backend Standards

- Use dependency injection for services
- Keep resolvers thin (delegate to services)
- Use DTOs for input validation
- Add JSDoc comments for public methods
- Implement error handling consistently

Example resolver:
```typescript
@Resolver('User')
export class UserResolver {
  constructor(private userService: UserService) {}

  /**
   * Get user by ID
   * @param id - User ID
   * @returns User data or null
   */
  @Query()
  async user(@Args('id') id: string): Promise<User | null> {
    return this.userService.findById(id);
  }
}
```

### GraphQL Standards

- Use scalar types appropriately
- Document complex types
- Use `!` for required fields
- Keep mutations focused

Example:
```graphql
"""
User account information
"""
type User {
  """Unique identifier"""
  id: ID!
  
  """Email address"""
  email: String!
  
  """User's full name"""
  name: String
  
  """Account creation timestamp"""
  createdAt: DateTime!
}

"""
Mutation payload with status"""
type CreateUserPayload {
  success: Boolean!
  user: User
  errors: [String!]
}
```

## Commits

### Commit Messages

Follow Conventional Commits format:
```
type(scope): subject

detailed explanation of changes

Fixes #123
```

### Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring without behavior changes
- **perf**: Performance improvements
- **test**: Test additions or updates
- **chore**: Dependency updates, build config, etc.

### Scope
Use the affected package or module:
- `api` - Backend changes
- `web` - Frontend changes
- `db-drivers` - Database drivers
- `shared-types` - Shared types

### Examples
```bash
git commit -m "feat(api): add connection health check endpoint"
git commit -m "fix(web): resolve table sorting issue"
git commit -m "docs(readme): update setup instructions"
git commit -m "refactor(db-drivers): simplify connection factory"
```

## Testing

> **Current status:** no Jest/Vitest unit-test framework is installed yet, so `pnpm test` is a
> no-op. The real automated check today is `packages/db-drivers/test/driver.test.ts` (a live
> integration script against the docker-compose target databases). Treat the sections below as
> the convention to adopt once a test framework is added, not a description of what exists now.
> a11y checks (`pnpm test:a11y`) are aspirational for the same reason — no accessibility test
> tooling is configured yet.

### Test Coverage Requirements

- New features should include tests
- Bug fixes should include a test reproducing the issue
- Aim for >80% coverage on critical paths

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter api test
pnpm --filter web test

# Watch mode
pnpm test -- --watch

# Coverage report
pnpm test -- --coverage
```

### Writing Tests

- Use descriptive test names
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies
- Test both happy path and error cases

Example:
```typescript
describe('ConnectionService', () => {
  describe('create', () => {
    it('should create a connection with valid input', async () => {
      // Arrange
      const input = { name: 'Test', type: 'postgres' };
      jest.spyOn(prisma.connection, 'create').mockResolvedValue(connection);

      // Act
      const result = await service.create(input);

      // Assert
      expect(result).toEqual(connection);
      expect(prisma.connection.create).toHaveBeenCalledWith({ data: input });
    });

    it('should throw error on duplicate connection name', async () => {
      // Arrange
      const input = { name: 'Duplicate', type: 'postgres' };
      jest.spyOn(prisma.connection, 'create').mockRejectedValue(new Error('Unique constraint'));

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow();
    });
  });
});
```

## Pull Requests

### Before Submitting

1. **Update your branch** with latest `main`
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run tests locally**
   ```bash
   pnpm test
   ```

3. **Lint your code**
   ```bash
   pnpm lint --fix
   pnpm format
   ```

4. **Verify the app runs**
   ```bash
   pnpm dev
   ```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring

## Related Issues
Fixes #123

## Testing
- [ ] Added tests
- [ ] Updated tests
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] No new warnings generated
- [ ] Documentation updated
- [ ] Changes are backward compatible
```

### PR Review Process

1. **Automated checks** will run (linting, tests)
2. **Code review** by maintainers
3. **Address feedback** with new commits
4. **Merge** when approved

### Addressing Feedback

When reviewers suggest changes:
- Respond to comments
- Make requested changes
- Push new commits (don't force push)
- Request re-review

## Documentation

### Documentation Standards

- Update [README.md](./README.md) for user-facing changes
- Update [ARCHITECTURE.md](./ARCHITECTURE.md) for system changes
- Update [DEVELOPMENT.md](./DEVELOPMENT.md) for workflow changes
- Add JSDoc comments for public APIs
- Include inline comments for complex logic

### Documentation Examples

**JSDoc for services**:
```typescript
/**
 * Manages database connections
 */
@Injectable()
export class ConnectionService {
  /**
   * Create a new database connection
   * @param input - Connection configuration
   * @returns Created connection entity
   * @throws ConnectionError if connection fails
   */
  async create(input: CreateConnectionInput): Promise<Connection> {
    // Implementation
  }
}
```

**Inline comments for complex logic**:
```typescript
// Retry connection with exponential backoff
// Start at 1s, double each attempt, max 10 attempts
const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
await new Promise(resolve => setTimeout(resolve, delay));
```

## Database Changes

### Migration Workflow

1. **Modify schema.prisma**
   ```bash
   vim apps/api/prisma/schema.prisma
   ```

2. **Create migration**
   ```bash
   pnpm db:migrate
   ```

3. **Test migration**
   ```bash
   # Verify with Prisma Studio
   pnpm db:studio
   ```

4. **Commit migration files**
   ```bash
   git add apps/api/prisma/migrations/
   git commit -m "chore(db): add users table"
   ```

### Schema Guidelines

- Use meaningful names (plural for tables)
- Add indexes for frequently queried columns
- Use appropriate field types
- Document complex relationships

## Dependency Updates

### Adding Dependencies

```bash
# Add to a specific package
pnpm --filter api add express

# Add as dev dependency
pnpm --filter web add -D @types/react
```

### Updating Dependencies

```bash
# Update all dependencies
pnpm update

# Update specific package
pnpm update @nestjs/core

# Check for updates
pnpm outdated
```

### Breaking Changes

- Coordinate with team before major version updates
- Test thoroughly before committing
- Update documentation as needed
- Note in PR description if breaking change

## Performance

### Performance Guidelines

- Avoid unnecessary re-renders in React (use memo, useMemo)
- Use DataLoader for batch queries in GraphQL
- Add indexes to database queries
- Monitor bundle size (frontend)
- Profile and optimize slow operations

### Performance Checklist

- [ ] No N+1 queries
- [ ] Appropriate caching strategy
- [ ] Lazy loading where beneficial
- [ ] No console errors/warnings
- [ ] Load time acceptable

## Accessibility

### Web Standards

- Use semantic HTML
- Ensure keyboard navigation works
- Provide alt text for images
- Maintain sufficient color contrast
- Support screen readers

### Testing Accessibility

```bash
# Run accessibility checks
pnpm test:a11y

# Manual testing
# - Keyboard only navigation
# - Screen reader testing
# - Color contrast verification
```

## Security

### Security Checklist

- [ ] No secrets in code/config files
- [ ] Input validation implemented
- [ ] SQL injection prevention (use Prisma)
- [ ] XSS prevention (React escapes by default)
- [ ] CSRF tokens if applicable
- [ ] Authentication required where needed
- [ ] Authorization checks implemented

### Reporting Security Issues

If you discover a security vulnerability:
1. **Do not** open a public issue
2. **Email** security team directly
3. **Include** vulnerability details and reproduction steps
4. **Wait** for acknowledgment before public disclosure

## Questions?

- Check [DEVELOPMENT.md](./DEVELOPMENT.md) for setup help
- Review [PROJECT_DISCOVERY.md](./PROJECT_DISCOVERY.md) for codebase questions
- Ask in GitHub issues or discussions

## Recognition

Contributors will be recognized in:
- CHANGELOG.md
- Project README
- Contributor list

Thank you for contributing! 🎉
