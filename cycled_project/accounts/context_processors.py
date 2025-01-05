from django_user_agents.utils import get_user_agent

def user_agent_processor(request):
    return {
        'user_agent': get_user_agent(request),
    }