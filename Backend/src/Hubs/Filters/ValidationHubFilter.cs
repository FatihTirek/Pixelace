using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.SignalR;

namespace Backend.src.Hubs.Filters
{
    public class ValidationHubFilter : IHubFilter
    {
        public async ValueTask<object?> InvokeMethodAsync(HubInvocationContext invocationContext, Func<HubInvocationContext, ValueTask<object?>> next)
        {
            foreach (var argument in invocationContext.HubMethodArguments)
            {
                if (argument == null) continue;

                var validationResults = new List<ValidationResult>();
                var validationContext = new ValidationContext(argument);

                if (!Validator.TryValidateObject(argument, validationContext, validationResults, validateAllProperties: true))
                {
                    var errors = string.Join("; ", validationResults.Select(r => r.ErrorMessage ?? "Validation error"));
                    throw new HubException($"Validation failed: {errors}");
                }
            }

            return await next(invocationContext);
        }
    }
}
