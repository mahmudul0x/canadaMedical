from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        errors = response.data if isinstance(response.data, dict) else {'detail': response.data}
        message = _extract_message(errors)
        response.data = {
            'success': False,
            'message': message,
            'errors': errors,
        }
    else:
        response = Response(
            {
                'success': False,
                'message': 'An unexpected error occurred.',
                'errors': {},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response


def _extract_message(errors):
    if isinstance(errors, dict):
        for key, value in errors.items():
            if key == 'detail':
                return str(value)
            if isinstance(value, list) and value:
                return str(value[0])
            if isinstance(value, str):
                return value
    if isinstance(errors, list) and errors:
        return str(errors[0])
    return 'An error occurred.'


def success_response(data=None, message='Operation successful', status_code=status.HTTP_200_OK):
    return Response(
        {
            'success': True,
            'message': message,
            'data': data,
        },
        status=status_code,
    )
